import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { documentApi } from "../../services/documentApi";
import { categoryApi } from "../../services/categoryApi";

export function CategoryDocumentsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, [categoryId]);

  const loadDocuments = async () => {
    try {
      const categoryResponse = await categoryApi.getCategories();

      const currentCategory = categoryResponse.data.find(
        (category) => category.id === Number(categoryId),
      );

      setCategoryName(currentCategory?.name ?? "Unknown Category");

      const response = await documentApi.getDocuments({
        page: 0,
        size: 100,
      });

      const filteredDocs = response.data.content.filter(
        (doc: any) => doc.categoryId === Number(categoryId),
      );

      setDocuments(filteredDocs);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/app/categories")}
        className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-300"
      >
        ← Back to Categories
      </button>
      <h1 className="text-3xl font-bold">{categoryName}</h1>

      {documents.map((doc) => (
        <div key={doc.id} className="rounded-xl border p-4">
          {doc.title}
        </div>
      ))}

      {documents.length === 0 && <p>No documents found.</p>}
    </div>
  );
}
