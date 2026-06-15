import { useEffect, useState } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate } from "react-router";

const API_BASE_URL = "http://localhost:8080/api";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
}

export function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(response.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load categories.");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter category name.");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/categories`, {
        name: name.trim(),
        description: description.trim(),
        userId: 1,
      });

      toast.success("Category created.");
      setName("");
      setDescription("");
      loadCategories();
    } catch (error) {
      console.error(error);
      toast.error("Cannot create category.");
    }
  };

  const handleDelete = async (id: number): Promise<boolean> => {
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`);

      toast.success("Category deleted.");
      await loadCategories();
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Cannot delete category.");
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
          Categories
        </p>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
          Manage Categories
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Create categories for uploaded study documents.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <button
          onClick={handleCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          <FolderPlus className="h-4 w-4" />
          Create Category
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => navigate(`/app/categories/${category.id}`)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {category.name}
                </p>
                <p className="text-sm text-slate-500">
                  {category.description || "No description"}
                </p>
              </div>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteId(category.id);
                }}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="text-sm text-slate-500">No categories yet.</p>
          )}
        </div>
      </section>
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Delete Category
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this category? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (deleteId === null) return;

                  const success = await handleDelete(deleteId);

                  if (success) {
                    setDeleteId(null);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
