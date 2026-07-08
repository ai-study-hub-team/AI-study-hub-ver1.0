import { useEffect, useState } from "react";
import {
  ChevronRight,
  FolderPlus,
  Library,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { documentApi } from "../../services/documentApi";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";
import type { DocumentListItemResponse } from "../../types/documents/types";
import { ActionMenuItem, RowActionMenu } from "../../components/ui/RowActionMenu";
type ListResponse<T> = T[] | { content?: T[] };

const normalizeList = <T,>(data: ListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
};

const getSafeUserId = (): number | null => {
  const rawUserId = getCurrentUserId();
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};

export function CategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>(
    {},
  );

  const loadCategories = async () => {
    try {
      const userId = getSafeUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const [categoryResponse, documentResponse] = await Promise.all([
        categoryApi.getCategories(),
        documentApi.getDocuments({
          page: 0,
          size: 1000,
        }),
      ]);

      const categoryData = normalizeList<CategoryResponse>(
        categoryResponse.data as ListResponse<CategoryResponse>,
      ).filter((category) => Number(category.userId) === userId);

      const documentData = filterMyDocuments(
        normalizeList<DocumentListItemResponse>(
          documentResponse.data as ListResponse<DocumentListItemResponse>,
        ),
        userId,
      );

      const counts = documentData.reduce<Record<number, number>>(
        (result, document) => {
          const categoryId = Number(document.categoryId);

          if (Number.isInteger(categoryId) && categoryId > 0) {
            result[categoryId] = (result[categoryId] ?? 0) + 1;
          }

          return result;
        },
        {},
      );

      setCategories(categoryData);
      setCategoryCounts(counts);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load categories.",
      );
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

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      await categoryApi.createCategory({
        name: name.trim(),
        description: description.trim(),
        userId,
      });

      toast.success("Category created.");
      setName("");
      setDescription("");
      await loadCategories();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot create category.",
      );
    }
  };

  const openEditModal = async (id: number) => {
    try {
      const userId = getSafeUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await categoryApi.getCategoryById(id);
      const category = response.data;

      if (Number(category.userId) !== userId) {
        toast.error("You do not have permission to edit this category.");
        return;
      }

      setEditId(category.id);
      setEditName(category.name ?? "");
      setEditDescription(category.description ?? "");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load category detail.",
      );
    }
  };

  const handleUpdate = async () => {
    if (editId === null) return;

    if (!editName.trim()) {
      toast.error("Please enter category name.");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      await categoryApi.updateCategory(editId, {
        name: editName.trim(),
        description: editDescription.trim(),
        userId,
      });

      toast.success("Category updated.");
      setEditId(null);
      setEditName("");
      setEditDescription("");
      await loadCategories();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot update category.",
      );
    }
  };

  const handleDelete = async (id: number): Promise<boolean> => {
    const itemCount = categoryCounts[id] ?? 0;

    if (itemCount > 0) {
      toast.error("Cannot delete category that contains documents.");
      return false;
    }

    try {
      await categoryApi.deleteCategory(id);

      toast.success("Category deleted.");
      await loadCategories();
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot delete category.",
      );
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
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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

      <section>
        <h2 className="mb-4 text-2xl font-extrabold text-slate-950 dark:text-white">
          Categories
        </h2>

        {categories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => {
              const itemCount = categoryCounts[category.id] ?? 0;

              const iconColor =
                index % 2 === 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300";

              return (
                <div
                  key={category.id}
                  onClick={() =>
                    navigate(`/app/categories/${category.id}`, {
                      state: { from: "/app/categories" },
                    })
                  }
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}
                    >
                      <Library className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-slate-950 dark:text-white">
                        {category.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {category.description?.trim() || "No description"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                        {itemCount} {itemCount === 1 ? "Item" : "Items"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RowActionMenu>
                      <ActionMenuItem icon={Pencil} label="Edit category" onClick={() => openEditModal(category.id)} />
                      <ActionMenuItem icon={Trash2} label="Delete category" onClick={() => setDeleteId(category.id)} danger />
                    </RowActionMenu>

                    <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No categories yet.
            </p>
          </div>
        )}
      </section>

      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Edit Category
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Category name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setEditName("");
                  setEditDescription("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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

            {(categoryCounts[deleteId] ?? 0) > 0 && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                This category contains {categoryCounts[deleteId]}{" "}
                {categoryCounts[deleteId] === 1 ? "document" : "documents"}.
                Please move or delete those documents first.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (deleteId === null) return;

                  const success = await handleDelete(deleteId);

                  if (success) {
                    setDeleteId(null);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 dark:disabled:bg-red-900"
                disabled={(categoryCounts[deleteId] ?? 0) > 0}
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
