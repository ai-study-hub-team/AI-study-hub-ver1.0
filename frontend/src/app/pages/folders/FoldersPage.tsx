import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderPlus,
  MoveRight,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { folderApi, type FolderResponse } from "../../services/folderApi";
import { documentApi } from "../../services/documentApi";
import { getCurrentUserId } from "../../services/apiClient";

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

const formatDate = (value?: string) => {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

export function FoldersPage() {
  const navigate = useNavigate();

  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [moveFolder, setMoveFolder] = useState<FolderResponse | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] =
    useState<string>("root");

  const loadFolders = async () => {
    try {
      const userId = getSafeUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await folderApi.getFolders(userId);

      const data = normalizeList<FolderResponse>(
        response.data as ListResponse<FolderResponse>,
      ).filter((folder) => {
        return Number(folder.userId) === userId;
      });

      setFolders(data);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load folders.",
      );
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const rootFolders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return folders
      .filter((folder) => folder.parentFolderId === null)
      .filter((folder) => {
        if (!keyword) return true;

        return (
          folder.name?.toLowerCase().includes(keyword) ||
          folder.description?.toLowerCase().includes(keyword)
        );
      });
  }, [folders, search]);

  const moveDestinationFolders = useMemo(() => {
    if (!moveFolder) return folders;

    return folders.filter(
      (folder) => Number(folder.id) !== Number(moveFolder.id),
    );
  }, [folders, moveFolder]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter folder name.");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      await folderApi.createFolder({
        name: name.trim(),
        description: description.trim(),
        userId,
        parentFolderId: null,
      });

      toast.success("Folder created.");
      setName("");
      setDescription("");
      await loadFolders();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot create folder.",
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

      const response = await folderApi.getFolderById(id, userId);
      const folder = response.data;

      if (Number(folder.userId) !== userId) {
        toast.error("You do not have permission to edit this folder.");
        return;
      }

      setEditId(folder.id);
      setEditName(folder.name ?? "");
      setEditDescription(folder.description ?? "");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load folder detail.",
      );
    }
  };

  const handleUpdate = async () => {
    if (editId === null) return;

    if (!editName.trim()) {
      toast.error("Please enter folder name.");
      return;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const currentFolder = folders.find((folder) => folder.id === editId);

    try {
      await folderApi.updateFolder(editId, {
        name: editName.trim(),
        description: editDescription.trim(),
        userId,
        parentFolderId: currentFolder?.parentFolderId ?? null,
      });

      toast.success("Folder updated.");
      setEditId(null);
      setEditName("");
      setEditDescription("");
      await loadFolders();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot update folder.",
      );
    }
  };

  const openMoveModal = (folder: FolderResponse) => {
    setMoveFolder(folder);
    setMoveTargetFolderId(
      folder.parentFolderId === null || folder.parentFolderId === undefined
        ? "root"
        : String(folder.parentFolderId),
    );
  };

  const handleMoveFolder = async () => {
    if (!moveFolder) return;

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const parentFolderId =
      moveTargetFolderId === "root" ? null : Number(moveTargetFolderId);

    if (parentFolderId !== null && Number(parentFolderId) === moveFolder.id) {
      toast.error("Cannot move folder into itself.");
      return;
    }

    try {
      await folderApi.updateFolder(moveFolder.id, {
        name: moveFolder.name,
        description: moveFolder.description ?? "",
        userId,
        parentFolderId,
      });

      toast.success(
        parentFolderId === null
          ? "Folder moved to Root."
          : "Folder moved successfully.",
      );

      setMoveFolder(null);
      setMoveTargetFolderId("root");
      await loadFolders();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot move folder.",
      );
    }
  };

  const moveFolderContentToRoot = async (folderId: number, userId: number) => {
    const documentsResponse = await documentApi.getDocuments({
      folderId,
      page: 0,
      size: 100,
    });

    const documentsInFolder = documentsResponse.data.content ?? [];

    await Promise.all(
      documentsInFolder.map((document) =>
        documentApi.moveDocumentToFolder(document.id, {
          userId,
          folderId: null,
        }),
      ),
    );

    const childFolders = folders.filter(
      (folder) => Number(folder.parentFolderId) === Number(folderId),
    );

    await Promise.all(
      childFolders.map((folder) =>
        folderApi.updateFolder(folder.id, {
          name: folder.name,
          description: folder.description ?? "",
          userId,
          parentFolderId: null,
        }),
      ),
    );
  };

  const handleDelete = async (id: number): Promise<boolean> => {
    const folder = folders.find((item) => item.id === id);

    if (!folder) {
      toast.error("Folder not found.");
      return false;
    }

    const userId = getSafeUserId();

    if (!userId) {
      toast.error("Please login again.");
      return false;
    }

    try {
      await moveFolderContentToRoot(id, userId);

      await folderApi.deleteFolder(id, userId);

      toast.success("Folder deleted. Documents and subfolders moved to Root.");
      await loadFolders();
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot delete folder.",
      );
      return false;
    }
  };

  const deletingFolder =
    deleteId !== null
      ? folders.find((folder) => folder.id === deleteId)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Folders
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            Manage Folders
          </h1>

          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Organize your study documents into folders.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
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
          Create Folder
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search folders..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-extrabold text-slate-950 dark:text-white">
          Your Folders
        </h2>

        {rootFolders.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rootFolders.map((folder, index) => {
              const iconColor =
                index % 2 === 0
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300";

              return (
                <div
                  key={folder.id}
                  onClick={() =>
                    navigate(`/app/folders/${folder.id}`, {
                      state: { from: "/app/folders" },
                    })
                  }
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}
                    >
                      <Folder className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-slate-950 dark:text-white">
                        {folder.name}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {folder.description?.trim() || "No description"}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                        {folder.documentCount ?? 0}{" "}
                        {(folder.documentCount ?? 0) === 1
                          ? "document"
                          : "documents"}{" "}
                        · {folder.childFolderCount ?? 0}{" "}
                        {(folder.childFolderCount ?? 0) === 1
                          ? "subfolder"
                          : "subfolders"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Updated {formatDate(folder.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openMoveModal(folder);
                      }}
                      className="rounded-lg p-2 text-emerald-500 opacity-100 transition hover:bg-emerald-50 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-emerald-950/30"
                      title="Move folder"
                    >
                      <MoveRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(folder.id);
                      }}
                      className="rounded-lg p-2 text-blue-500 opacity-100 transition hover:bg-blue-50 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-blue-950/30"
                      title="Edit folder"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteId(folder.id);
                      }}
                      className="rounded-lg p-2 text-red-500 opacity-100 transition hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-red-950/30"
                      title="Delete folder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
              <Folder className="h-7 w-7" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
              No folders yet.
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your first folder to organize documents.
            </p>
          </div>
        )}
      </section>

      {moveFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Move Folder
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Move "{moveFolder.name}" into another folder or back to Root.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Destination
              </label>

              <select
                value={moveTargetFolderId}
                onChange={(event) => setMoveTargetFolderId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-800"
              >
                <option value="root">Root</option>

                {moveDestinationFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMoveFolder(null);
                  setMoveTargetFolderId("root");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveFolder}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Edit Folder
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Folder name"
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
              Delete Folder
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this folder? Documents and
              subfolders inside it will be moved to Root.
            </p>

            {deletingFolder &&
              ((deletingFolder.documentCount ?? 0) > 0 ||
                (deletingFolder.childFolderCount ?? 0) > 0) && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                  This folder contains {deletingFolder.documentCount ?? 0}{" "}
                  {(deletingFolder.documentCount ?? 0) === 1
                    ? "document"
                    : "documents"}{" "}
                  and {deletingFolder.childFolderCount ?? 0}{" "}
                  {(deletingFolder.childFolderCount ?? 0) === 1
                    ? "subfolder"
                    : "subfolders"}
                  . They will be moved to Root after deleting this folder.
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