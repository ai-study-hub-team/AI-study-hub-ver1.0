import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { categoryApi } from '../api';

const { Title } = Typography;
const { TextArea } = Input;

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      fetchCategory();
    }
  }, [id]);

  const fetchCategory = async () => {
    setFetching(true);
    try {
      const data = await categoryApi.getById(id);
      form.setFieldsValue({
        name: data.name,
        description: data.description,
      });
    } catch (err) {
      console.error(err);
      message.error('Failed to load category data');
      navigate('/categories');
    } finally {
      setFetching(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (isEditMode) {
        await categoryApi.update(id, values);
        message.success('Category updated successfully');
      } else {
        await categoryApi.create(values);
        message.success('Category created successfully');
      }
      navigate('/categories');
    } catch (err) {
      console.error(err);
      message.error(isEditMode ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/categories')}
        style={{ paddingLeft: 0, marginBottom: 16 }}
      >
        Back to List
      </Button>

      <Card bordered={false}>
        <Title level={3} style={{ marginTop: 0, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
          {isEditMode ? 'Edit Category' : 'Create New Category'}
        </Title>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Spin tip="Fetching category details..." />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item
              label="Category Name"
              name="name"
              rules={[{ required: true, message: 'Please enter category name' }]}
            >
              <Input placeholder="e.g. Computer Science, Mathematics, Physics" size="large" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                rows={4}
                placeholder="Brief description of the category..."
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
                block
                style={{ borderRadius: 6 }}
              >
                {isEditMode ? 'Save Changes' : 'Create Category'}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
