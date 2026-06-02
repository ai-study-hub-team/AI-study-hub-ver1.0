import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, Input, Button, Space, Popconfirm, Tag, message, Typography, Tooltip } from 'antd';
import {
  SearchOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { documentApi } from '../api';

const { Title, Paragraph } = Typography;

export default function DocumentList() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for backend
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchDocuments(currentPage, pageSize, keyword);
  }, [currentPage, pageSize]);

  const fetchDocuments = async (page, size, searchKeyword) => {
    setLoading(true);
    try {
      let data;
      if (searchKeyword.trim()) {
        data = await documentApi.search(searchKeyword, page, size);
      } else {
        data = await documentApi.getAll(page, size);
      }
      setDocuments(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error(err);
      message.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(0); // Reset to first page
    fetchDocuments(0, pageSize, keyword);
  };

  const handleClearSearch = () => {
    setKeyword('');
    setCurrentPage(0);
    fetchDocuments(0, pageSize, '');
  };

  const handleDelete = async (id) => {
    try {
      await documentApi.delete(id);
      message.success('Document soft-deleted successfully');
      // Reload current page
      fetchDocuments(currentPage, pageSize, keyword);
    } catch (err) {
      console.error(err);
      message.error('Failed to delete document');
    }
  };

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current - 1); // convert 1-indexed to 0-indexed
    setPageSize(pagination.pageSize);
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FileOutlined />;
    const mime = fileType.toLowerCase();
    if (mime.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (mime.includes('word') || mime.includes('docx') || mime.includes('document')) 
      return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (mime.includes('presentation') || mime.includes('pptx') || mime.includes('powerpoint')) 
      return <FilePptOutlined style={{ color: '#fa8c16' }} />;
    if (mime.includes('text') || mime.includes('txt')) 
      return <FileTextOutlined style={{ color: '#52c41a' }} />;
    return <FileOutlined />;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Link to={`/documents/${record.id}`} style={{ fontWeight: 600 }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#bfbfbf' }}>None</span>,
    },
    {
      title: 'File Type',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 150,
      render: (text, record) => (
        <Space>
          {getFileIcon(text)}
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {record.originalName ? record.originalName.split('.').pop().toUpperCase() : 'Unknown'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 120,
      render: (size) => formatBytes(size),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => {
        if (!tags) return null;
        return (
          <Space size={[0, 4]} wrap>
            {tags.split(',').map((tag) => (
              <Tag key={tag} color="geekblue">{tag}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            onClick={() => navigate(`/documents/${record.id}`)}
          >
            View
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this document? (Soft Delete)"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontFamily: "'Outfit', sans-serif" }}>Documents</Title>
          <Paragraph type="secondary">
            View, search, and delete your uploaded files. All deletions are soft-deletes (status = DELETED).
          </Paragraph>
        </div>
        <Link to="/documents/upload">
          <Button type="primary" icon={<CloudUploadOutlined />} size="large" style={{ borderRadius: 6 }}>
            Upload Document
          </Button>
        </Link>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="Search documents by title or tags..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ maxWidth: 400 }}
          size="large"
          allowClear
          onClear={handleClearSearch}
        />
        <Button type="primary" onClick={handleSearch} size="large" style={{ borderRadius: 6 }}>
          Search
        </Button>
        {keyword && (
          <Button onClick={handleClearSearch} size="large" style={{ borderRadius: 6 }}>
            Clear
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage + 1, // backend is 0-indexed, Table pagination is 1-indexed
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
        }}
        onChange={handleTableChange}
        bordered
      />
    </div>
  );
}
