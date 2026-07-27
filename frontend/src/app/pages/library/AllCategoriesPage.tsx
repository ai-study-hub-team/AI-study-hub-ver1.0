import {
  ArrowLeft,
  FolderPlus,
  Library,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
import { PaginationControls } from "../../components/ui/PaginationControls";

export function AllCategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedCategories = categories.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [editingCategory, setEditingCategory] =
    useState<CategoryResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadCategories = async () => {
    try {
      const response = await categoryApi.getCategories();
      setCategories(response.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load categories.");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenEdit = (category: CategoryResponse) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  };

const handleUpdateCategory = async () => {
  if (!editingCategory) return;

  if (!editName.trim()) {
    toast.error("Category name is required.");
    return;
  }

  try {
    await categoryApi.updateCategory(editingCategory.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      userId: editingCategory.userId,
    });

    toast.success("Category updated.");
    setEditingCategory(null);
    setEditName("");
    setEditDescription("");
    await loadCategories();
  } catch (error) {
    console.error(error);
    toast.error("Cannot update category.");
  }
};

  const handleDeleteCategory = async () => {
    if (!deleteId) return;

    try {
      await categoryApi.deleteCategory(deleteId);
      toast.success("Category deleted.");
      setDeleteId(null);
      await loadCategories();
    } catch (error) {
      console.error(error);
      toast.error("Cannot delete category.");
    }
  };

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
          <h1 className="text-3xl font-extrabold text-slate-900">
            All Categories
          </h1>
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
        {paginatedCategories.map((category) => (
          <div
            key={category.id}
            onClick={() =>
              navigate(`/app/categories/${category.id}`, {
                state: { from: "/app/library/categories" },
              })
            }
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-200 hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Library className="h-5 w-5" />
              </div>

              <div className="flex shrink-0 items-center">
                <RowActionMenu>
                  <ActionMenuItem icon={Pencil} label="Edit category" onClick={() => handleOpenEdit(category)} />
                  <ActionMenuItem icon={Trash2} label="Delete category" onClick={() => setDeleteId(category.id)} danger />
                </RowActionMenu>
              </div>
            </div>

            <h3 className="font-bold text-slate-900">{category.name}</h3>

            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {category.description || "No description"}
            </p>
          </div>
        ))}
      </div>
      <PaginationControls currentPage={currentPage} totalItems={categories.length} pageSize={pageSize} onPageChange={setCurrentPage} />

      {categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Library className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900">No categories found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a category to organize your documents.
          </p>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Category
              </h2>

              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Name
                </label>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Category description"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingCategory(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateCategory}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Delete Category?
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This action cannot be undone. If this category contains documents,
              the server may prevent deletion.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteCategory}
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

