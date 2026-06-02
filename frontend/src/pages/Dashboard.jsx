import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Button, List, Spin, message, Typography, Space } from 'antd';
import {
  FolderOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { categoryApi, documentApi } from '../api';

const { Title, Paragraph } = Typography;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [cats, docs] = await Promise.all([
        categoryApi.getAll(),
        documentApi.getAll(0, 5), // Load top 5 for recent activity
      ]);
      setCategories(cats || []);
      setDocuments(docs.content || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="Loading statistics..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontFamily: "'Outfit', sans-serif" }}>Welcome to AI Study Hub</Title>
        <Paragraph type="secondary">
          Manage, upload, and search your study materials. This frontend acts as a prototype to test the Spring Boot APIs.
        </Paragraph>
      </div>

      <Row Gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} style={{ background: '#e0e7ff' }}>
            <Statistic
              title={<span className="stat-card-title">Total Categories</span>}
              value={categories.length}
              prefix={<FolderOutlined style={{ color: '#4f46e5' }} />}
              valueStyle={{ color: '#4f46e5', fontWeight: 700 }}
            />
            <div style={{ marginTop: 12 }}>
              <Link to="/categories">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  Manage Categories <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} style={{ background: '#fef3c7' }}>
            <Statistic
              title={<span className="stat-card-title">Latest Documents</span>}
              value={documents.length > 0 ? documents.length : 0}
              prefix={<FileTextOutlined style={{ color: '#d97706' }} />}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
            <div style={{ marginTop: 12 }}>
              <Link to="/documents">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  View All Documents <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={24} lg={8}>
          <Card bordered={false} style={{ background: '#dcfce7', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-card-title">Quick Upload</div>
                <div style={{ margin: '8px 0', fontSize: '0.9rem', color: '#166534' }}>
                  Upload PDF, DOCX, PPTX, or TXT study documents.
                </div>
              </div>
              <Link to="/documents/upload">
                <Button type="primary" icon={<CloudUploadOutlined />} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', borderRadius: 6 }}>
                  Upload File Now
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title="Quick Links & Info" bordered={false} style={{ minHeight: 280 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <strong>Active User context:</strong> ID 1 (Standard test account)
              </div>
              <div>
                <strong>Backend URL:</strong> <a href="http://localhost:8080" target="_blank" rel="noreferrer">http://localhost:8080</a>
              </div>
              <div>
                <strong>Supported File formats:</strong> PDF, Word (DOCX), PowerPoint (PPTX), Plain Text (TXT)
              </div>
              <div>
                <strong>LocalStorage directory:</strong> Local upload copies files directly into the backend project's <code>uploads/</code> directory.
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Recent Uploads"
            bordered={false}
            extra={<Link to="/documents">See All</Link>}
            style={{ minHeight: 280 }}
          >
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>
                No documents uploaded yet.
              </div>
            ) : (
              <List
                dataSource={documents}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Link to={`/documents/${item.id}`} key="view">
                        View
                      </Link>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ fontSize: 24, color: '#4f46e5' }} />}
                      title={item.title}
                      description={item.description || 'No description provided'}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
