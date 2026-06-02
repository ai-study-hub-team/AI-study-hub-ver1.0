import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Typography, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { categoryApi } from '../api';

const { Title, Paragraph } = Typography;

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to load categories. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryApi.delete(id);
      message.success('Category deleted successfully');
      fetchCategories(); // Reload list
    } catch (err) {
      console.error(err);
      message.error('Failed to delete category');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <FolderOpenOutlined style={{ color: '#4f46e5' }} />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description</span>,
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
            icon={<EditOutlined />}
            onClick={() => navigate(`/categories/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this category?"
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
          <Title level={2} style={{ margin: 0, fontFamily: "'Outfit', sans-serif" }}>Categories</Title>
          <Paragraph type="secondary">
            Manage category classifications for documents. Documents can optionally reference a category.
          </Paragraph>
        </div>
        <Link to="/categories/new">
          <Button type="primary" icon={<PlusOutlined />} size="large" style={{ borderRadius: 6 }}>
            Create Category
          </Button>
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="Loading categories..." />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      )}
    </div>
  );
}
