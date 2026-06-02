import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Space, Typography, Card, Button } from 'antd';
import {
  DashboardOutlined,
  FolderOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  UserOutlined,
} from '@ant-design/icons';

// Import Pages
import Dashboard from './pages/Dashboard';
import CategoryList from './pages/CategoryList';
import CategoryForm from './pages/CategoryForm';
import DocumentList from './pages/DocumentList';
import DocumentUpload from './pages/DocumentUpload';
import DocumentDetail from './pages/DocumentDetail';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

function AppContent() {
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState('/');

  useEffect(() => {
    // Map current pathname to menu selected keys
    const path = location.pathname;
    if (path.startsWith('/categories')) {
      setSelectedKey('/categories');
    } else if (path.startsWith('/documents/upload')) {
      setSelectedKey('/documents/upload');
    } else if (path.startsWith('/documents')) {
      setSelectedKey('/documents');
    } else {
      setSelectedKey('/');
    }
  }, [location]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="dark"
        style={{
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 10,
        }}
      >
        <div className="logo-container">
          <div className="logo-text">
            AI Study <span className="logo-accent">Hub</span>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: '/',
              icon: <DashboardOutlined />,
              label: <Link to="/">Dashboard</Link>,
            },
            {
              key: '/categories',
              icon: <FolderOutlined />,
              label: <Link to="/categories">Categories</Link>,
            },
            {
              key: '/documents',
              icon: <FileTextOutlined />,
              label: <Link to="/documents">Documents</Link>,
            },
            {
              key: '/documents/upload',
              icon: <CloudUploadOutlined />,
              label: <Link to="/documents/upload">Upload Document</Link>,
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>
            Prototype Admin Console
          </Typography.Title>
          <Space size="middle">
            <Card
              size="small"
              bordered={false}
              style={{ background: '#f1f5f9', borderRadius: 20, cursor: 'default' }}
              bodyStyle={{ padding: '4px 12px', display: 'flex', alignItems: 'center' }}
            >
              <UserOutlined style={{ marginRight: 6, color: '#4f46e5' }} />
              <Text strong style={{ fontSize: '0.85rem' }}>Testing User ID: 1</Text>
            </Card>
          </Space>
        </Header>

        <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', borderRadius: 12, minHeight: 360 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/categories" element={<CategoryList />} />
              <Route path="/categories/new" element={<CategoryForm />} />
              <Route path="/categories/edit/:id" element={<CategoryForm />} />
              <Route path="/documents" element={<DocumentList />} />
              <Route path="/documents/upload" element={<DocumentUpload />} />
              <Route path="/documents/:id" element={<DocumentDetail />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
