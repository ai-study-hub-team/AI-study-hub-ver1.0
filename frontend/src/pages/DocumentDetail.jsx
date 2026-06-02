import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Descriptions, Button, Typography, Tag, Space,
  Spin, Alert, message, Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileOutlined,
  DownloadOutlined,
  EyeOutlined,
  FolderOutlined,
  CalendarOutlined,
  TagOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { documentApi } from '../api';

const { Title, Paragraph, Text } = Typography;

// Helpers ─────────────────────────────────────────────────────────────────────

function getFileIcon(fileType) {
  if (!fileType) return <FileOutlined style={{ fontSize: 32 }} />;
  const mime = fileType.toLowerCase();
  if (mime.includes('pdf'))
    return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />;
  if (mime.includes('word') || mime.includes('docx') || mime.includes('document'))
    return <FileWordOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
  if (mime.includes('presentation') || mime.includes('pptx') || mime.includes('powerpoint'))
    return <FilePptOutlined style={{ fontSize: 32, color: '#fa8c16' }} />;
  if (mime.includes('text') || mime.includes('txt'))
    return <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
  return <FileOutlined style={{ fontSize: 32 }} />;
}

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

/**
 * Returns true if the file type supports in-page preview (PDF and plain text).
 * DOCX and PPTX are binary formats browsers cannot render natively.
 */
function supportsInlinePreview(fileType) {
  if (!fileType) return false;
  const mime = fileType.toLowerCase();
  return mime.includes('pdf') || mime.includes('text/plain') || mime.includes('txt');
}

// Component ───────────────────────────────────────────────────────────────────

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const data = await documentApi.getById(id);
      setDoc(data);
    } catch (err) {
      console.error(err);
      message.error('Failed to load document details');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="Loading document details..." />
      </div>
    );
  }

  if (!doc) {
    return (
      <div>
        <Alert message="Document Not Found" type="error" showIcon />
        <Button onClick={() => navigate('/documents')} style={{ marginTop: 16 }}>
          Back to List
        </Button>
      </div>
    );
  }

  // These URLs go through the Vite proxy → Spring Boot
  const fileUrl      = `/api/documents/${id}/file`;
  const downloadUrl  = `/api/documents/${id}/download`;
  const hasFile      = !!doc.fileName;
  const canPreview   = hasFile && supportsInlinePreview(doc.fileType);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/documents')}
        style={{ paddingLeft: 0, marginBottom: 16 }}
      >
        Back to List
      </Button>

      <Card bordered={false} style={{ marginBottom: 24 }}>

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          {getFileIcon(doc.fileType)}
          <div style={{ flex: 1 }}>
            <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              {doc.title}
            </Title>
            <Space size="middle" style={{ marginTop: 8 }}>
              {doc.categoryName && (
                <Tag color="blue" icon={<FolderOutlined />}>
                  {doc.categoryName}
                </Tag>
              )}
              {doc.tags &&
                doc.tags.split(',').map((t) => (
                  <Tag key={t} color="purple" icon={<TagOutlined />}>
                    {t}
                  </Tag>
                ))}
            </Space>
          </div>
        </div>

        <Paragraph style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6 }}>
          {doc.description || (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description provided.</span>
          )}
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        {hasFile && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 20,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 12, color: '#475569' }}>
              File Actions
            </Text>
            <Space wrap>
              {/* View in New Tab — browser handles PDF natively */}
              <Button
                type="primary"
                ghost
                icon={<LinkOutlined />}
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                View in New Tab
              </Button>

              {/* Download — Content-Disposition: attachment with original name */}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                href={downloadUrl}
                download
              >
                Download
              </Button>

              {/* Preview toggle */}
              <Button
                icon={<EyeOutlined />}
                onClick={() => setShowPreview((prev) => !prev)}
              >
                {showPreview ? 'Hide Preview' : 'Preview in Page'}
              </Button>
            </Space>
          </div>
        )}

        {/* ── Inline Preview panel ─────────────────────────────────────────── */}
        {showPreview && hasFile && (
          <div style={{ marginBottom: 24 }}>
            {canPreview ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  src={fileUrl}
                  title="Document Preview"
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <Alert
                type="info"
                showIcon
                message="Preview not supported"
                description={
                  <>
                    <strong>{doc.originalName}</strong> is a{' '}
                    {doc.fileType?.includes('word') || doc.fileName?.endsWith('.docx')
                      ? 'Word (DOCX)'
                      : 'PowerPoint (PPTX)'}{' '}
                    file. Browsers cannot render this format inline.{' '}
                    <a href={downloadUrl} download>
                      Download the file
                    </a>{' '}
                    to open it in the appropriate app.
                  </>
                }
              />
            )}
          </div>
        )}

        {/* ── Document metadata ───────────────────────────────────────────── */}
        <Descriptions title="Document Info" bordered column={{ xs: 1, sm: 2 }} size="middle">
          <Descriptions.Item label="Owner (User ID)">{doc.userId || 1}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={doc.status === 'ACTIVE' ? 'success' : 'default'}>{doc.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            <Space>
              <CalendarOutlined style={{ color: '#94a3b8' }} />
              {formatDate(doc.createdAt)}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            <Space>
              <CalendarOutlined style={{ color: '#94a3b8' }} />
              {formatDate(doc.updatedAt)}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '24px 0' }} />

        {/* ── CloudFile metadata ──────────────────────────────────────────── */}
        <Descriptions
          title="CloudFile Storage Metadata"
          bordered
          column={{ xs: 1, sm: 2 }}
          size="middle"
        >
          <Descriptions.Item label="Original File Name" span={2}>
            <Text strong style={{ color: '#4f46e5' }}>{doc.originalName || 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Stored File Name" span={2}>
            <code>{doc.fileName || 'N/A'}</code>
          </Descriptions.Item>
          <Descriptions.Item label="File Type">{doc.fileType || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="File Size">{formatBytes(doc.fileSize)}</Descriptions.Item>
          <Descriptions.Item label="File Path / URL" span={2}>
            <code>{doc.fileUrl || 'N/A'}</code>
          </Descriptions.Item>
          <Descriptions.Item label="Storage Provider" span={2}>
            <Tag color="cyan" style={{ fontWeight: 'bold' }}>
              {doc.storageProvider || 'N/A'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
