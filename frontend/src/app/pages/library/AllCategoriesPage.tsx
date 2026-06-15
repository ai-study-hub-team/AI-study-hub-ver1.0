import { ArrowLeft, FolderPlus, Library } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:8080/api";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
}

export function AllCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/categories`);
        setCategories(response.data ?? []);
      } catch (error) {
        console.error(error);
        toast.error("Cannot load categories.");
      }
    };

    loadCategories();
  }, []);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/library")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">All Categories</h1>
          <p className="text-slate-500">View all library categories.</p>
        </div>

        <button
          onClick={() => navigate("/app/categories")}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
        >
          <FolderPlus className="h-4.5 w-4.5" />
          New Category
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => navigate(`/app/library/categories/${category.id}`)}
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-200 hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Library className="h-5 w-5" />
            </div>

            <h3 className="font-bold text-slate-900">{category.name}</h3>

            <p className="mt-1 text-sm text-slate-500">
              {category.description || "No description"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
