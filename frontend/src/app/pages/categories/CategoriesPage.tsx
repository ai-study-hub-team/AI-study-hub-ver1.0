import { useState } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter category name.");
      return;
    }

    setCategories((current) => [
      ...current,
      {
        id: Date.now(),
        name: name.trim(),
        description: description.trim(),
      },
    ]);

    toast.success("Category created.");
    setName("");
    setDescription("");
  };

  const handleDelete = (id: number) => {
    setCategories((current) => current.filter((category) => category.id !== id));
    toast.success("Category deleted.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Categories</p>
        <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Manage Categories</h1>
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
              className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-700"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{category.name}</p>
                <p className="text-sm text-slate-500">{category.description || "No description"}</p>
              </div>

              <button
                onClick={() => handleDelete(category.id)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && <p className="text-sm text-slate-500">No categories yet.</p>}
        </div>
      </section>
    </div>
  );
}