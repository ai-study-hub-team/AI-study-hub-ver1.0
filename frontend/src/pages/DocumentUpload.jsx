import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Upload, Card, message, Typography } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { categoryApi, documentApi } from '../api';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to load categories for selection.');
    }
  };

  const onFinish = async (values) => {
    // Validate file list and file object existence before proceeding
    if (fileList.length === 0 || !fileList[0]?.originFileObj) {
      message.error('Please select a valid file to upload.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const selectedFile = fileList[0].originFileObj;
      
      formData.append('file', selectedFile);
      formData.append('title', values.title);
      formData.append('userId', '1'); // Default userId = 1 for now

      if (values.description) {
        formData.append('description', values.description);
      }
      if (values.documentType) {
        formData.append('documentType', values.documentType); // sends enum values like LECTURE
      }
      if (values.visibility) {
        formData.append('visibility', values.visibility); // sends enum values like PUBLIC
      }
      if (values.categoryId) {
        formData.append('categoryId', values.categoryId);
      }

      await documentApi.upload(formData);
      message.success('Document uploaded and metadata saved successfully!');
      navigate('/documents');
    } catch (err) {
      console.error('Upload error details:', err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Unknown error';
      message.error(`Upload failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Dragger upload props
  const draggerProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      // Validate extensions before adding to list
      const allowedExtensions = ['pdf', 'docx', 'pptx', 'txt'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const isAllowed = allowedExtensions.includes(fileExtension);
      
      if (!isAllowed) {
        message.error(`${file.name} is not a supported file. Please upload PDF, DOCX, PPTX, or TXT.`);
        return Upload.LIST_IGNORE;
      }
      
      // Limit file size to 50MB
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('File must be smaller than 50MB!');
        return Upload.LIST_IGNORE;
      }

      return false; // Stop auto-upload and keep in fileList
    },
    onChange: ({ fileList }) => {
      // Filter out ignored files (which don't have originFileObj or are invalid)
      const validFiles = fileList.filter(file => file.status !== 'error' && file.status !== 'removed');
      setFileList(validFiles);
    },
    fileList,
    maxCount: 1,
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/documents')}
        style={{ paddingLeft: 0, marginBottom: 16 }}
      >
        Back to List
      </Button>

      <Card bordered={false}>
        <Title level={3} style={{ marginTop: 0, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
          Upload New Document
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Upload a local study document. Its metadata and physical storage will be managed locally.
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            documentType: 'LECTURE',
            visibility: 'PUBLIC',
          }}
        >
          <Form.Item label="Select Document File" required>
            <Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#4f46e5' }} />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for PDF, DOCX, PPTX, and TXT files. Max size: 50MB.
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            label="Document Title"
            name="title"
            rules={[{ required: true, message: 'Please enter document title' }]}
          >
            <Input placeholder="e.g. Week 1: Introduction to Spring Boot" size="large" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Brief summary or description of the document contents..."
              size="large"
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Document Type"
              name="documentType"
            >
              <Select size="large">
                <Select.Option value="LECTURE">Lecture Note</Select.Option>
                <Select.Option value="EXERCISE">Exercise / Lab</Select.Option>
                <Select.Option value="SUMMARY">Revision Summary</Select.Option>
                <Select.Option value="PAST_EXAM">Past Exam Paper</Select.Option>
                <Select.Option value="SYLLABUS">Syllabus / Guide</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Visibility"
              name="visibility"
            >
              <Select size="large">
                <Select.Option value="PUBLIC">Public (All students)</Select.Option>
                <Select.Option value="PRIVATE">Private (Only me)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Category"
            name="categoryId"
          >
            <Select placeholder="Select a category (optional)" size="large" allowClear>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<UploadOutlined />}
              loading={loading}
              size="large"
              block
              style={{ borderRadius: 6 }}
            >
              Upload & Save Document
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
