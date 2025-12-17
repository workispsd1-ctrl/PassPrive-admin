"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Trash2,
  Info,
  Edit,
  FileText,
  Search,
  Plus,
  Loader2,
  Loader,
  ArrowLeft,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Modal from "../../../_components/Modal";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "../../../_components/Pagination";
import DeleteModal from "../../../_components/DeleteModal";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const confirmOpen = pendingId !== null;
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const totalPages = Math.ceil(total / limit);

  // State for adding a new lead
  const [newLead, setNewLead] = useState({
    id: crypto.randomUUID(),
    name: "",
    email: "",
    phone: "",
    convo: "",
    notes: "",
    created_date: "",
    updated_date: "",
  });

  // State for editing an existing lead
  const [isEditing, setIsEditing] = useState(false);
  const [editLead, setEditLead] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    convo: "",
    notes: "",
    created_date: "",
    updated_date: "",
  });
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState(null);
  const [deleteRefresh, setDeleteRefresh] = useState(null);

  const params = useParams();
  const userIdFromParams = params?.id;

  const handleRefresh = () => {
    setPage(1);
    setDeleteRefresh(Math.random());
  };

  // Function to fetch leads from Supabase
  const handleFetchLeads = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser();

      if (userError || !user) {
        console.error("No user found:", userError);
        setError("No authenticated user");
        setLoading(false);
        return;
      }

      let query = supabaseBrowser
        .from("leads")
        .select("*", { count: "exact" })
        .eq("user_id", userIdFromParams)
        .order("created_date", { ascending: false });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setLeads(data || []);
        setTotal(count || 0);
      }
    } catch (error) {
      console.error(error);
      setError("Failed to fetch lead data");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    handleFetchLeads();
  }, [page, deleteRefresh, limit]);

const filteredLeads = useMemo(() => {
  if (!searchTerm.trim()) {
    return leads;
  }
  const lowercasedSearchTerm = searchTerm.toLowerCase();
  return leads.filter((lead) => {
    const createdDate = lead.created_date
      ? new Date(lead.created_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

    return (
      (lead.name?.toLowerCase() ?? "").includes(lowercasedSearchTerm) ||
      (lead.email?.toLowerCase() ?? "").includes(lowercasedSearchTerm) ||
      (lead.phone?.toLowerCase() ?? "").includes(lowercasedSearchTerm) ||
      createdDate.toLowerCase().includes(lowercasedSearchTerm)
    );
  });
}, [leads, searchTerm]);


  if (loading) {
    return (
      <div className="space-y-6 animate-pulse flex justify-center items-center h-screen">
        <Loader className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6 text-center text-red-500">
        <h2 className="text-lg font-semibold">Error: {error}</h2>
        <p>There was an issue loading the data. Please try again later.</p>
      </div>
    );
  }

  // Handle lead deletion
  async function confirmDelete() {
    if (!pendingId) return;

    const id = pendingId;
    setPendingId(null);

    const { error } = await supabaseBrowser.from("leads").delete().eq("id", id);

    if (error) {
      showToast({
        title: "Error",
        description: "Something went wrong while deleting!",
      });
      handleRefresh();
    } else {
      showToast({
        title: "Success",
        description: "Lead deleted successfully!",
      });
      handleRefresh();
    }
  }

  // Populate the edit form with selected lead data
  const handleEditForm = (lead) => {
    setEditLead(lead);
    setIsEditing(true);
  };

  // Handle adding a new lead
  const handleAddLead = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();
    const now = new Date().toISOString();
    const payload = {
      ...newLead,
      user_id: user.id,
      created_date: now,
      updated_date: now,
    };

    const { error } = await supabaseBrowser.from("leads").insert(payload);

    if (error) {
      showToast({
        title: "Error",
        description: `Save failed: ${error.message}`,
      });
    } else {
      setDialogOpen(false);
      setNewLead({
        id: crypto.randomUUID(),
        name: "",
        email: "",
        phone: "",
        convo: "",
        notes: "",
        created_date: "",
        updated_date: "",
      });
      showToast({
        title: "Success",
        description: "Lead added successfully!",
      });
      handleRefresh();
    }
    setSaving(false);
  };

  // Handle saving edits to an existing lead
  const handleEditLead = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      ...editLead,
      updated_date: now,
    };

    const { error } = await supabaseBrowser
      .from("leads")
      .update(payload)
      .eq("id", editLead.id)
      .select()
      .single();

    if (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    } else {
      showToast({
        title: "Success",
        description: "Lead updated successfully!",
      });
      handleRefresh();
      setIsEditing(false);
      setEditLead({
        id: "",
        name: "",
        email: "",
        phone: "",
        convo: "",
        notes: "",
        created_date: "",
        updated_date: "",
      });
    }
    setSaving(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/users">
          <ArrowLeft
            size={20}
            className="text-gray-500 hover:text-blue-600 cursor-pointer"
          />
        </Link>
      </div>
      <div className="min-h-screen bg-white p-4">
        <div className="relative flex-1 mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Lead Name, Email, Phone or Lead Date..."
            className="pl-9 border-gray-200" // Updated border color here
            value={searchTerm}
            disabled={loading}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white">
          <button
            onClick={() => setDialogOpen(true)}
            className="fixed bottom-6 right-6 z-50 rounded-full p-4 bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
            title="Add a new lead"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {filteredLeads.length === 0 && !loading ? (
          <div className="flex flex-col justify-center items-center text-gray-900 p-6">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">
              {searchTerm
                ? "No results found for your search."
                : "No Leads Found"}
            </h2>
            {searchTerm && (
              <p className="text-sm text-gray-500">
                Try adjusting your search term or clearing it.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg  lg:w-full md:w-full w-[320px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Phone
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Message ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Conversation
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created At
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="break-words px-6 py-4 text-sm font-medium text-gray-900">
                      {lead?.name}
                    </td>
                    <td className="px-6 py-4 break-words text-sm text-gray-900">
                      {lead?.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead?.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead?.message_id}
                    </td>
                    <td className="px-6 py-4 break-words text-sm text-gray-900 max-w-[200px]">
                      {lead?.convo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead?.created_date
                        ? new Date(lead.created_date).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true, // 24-hour format
                          })
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-4">
                        <Button
                          disabled={loading}
                          onClick={() => {
                            setIsOpenDeleted(true);
                            setRowData(lead);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-red-500 hover:bg-gray-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            handleEditForm(lead);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => {
                            setSelectedData(lead);
                            setIsOpen(true);
                          }}
                          className="cursor-pointer p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-auto">
              <PaginationBar
                page={page}
                setPage={setPage}
                totalPage={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={setLimit}
              />
            </div>
          </div>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Create New Lead
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Name <sup>*</sup>{" "}
                </label>
                <Input
                  value={newLead.name}
                  onChange={(e) =>
                    setNewLead({ ...newLead, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Email <sup>*</sup>{" "}
                </label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) =>
                    setNewLead({ ...newLead, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Phone <sup>*</sup>{" "}
                </label>
                <Input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) =>
                    setNewLead({ ...newLead, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Conversation</label>
                <Textarea
                  value={newLead.convo}
                  onChange={(e) =>
                    setNewLead({ ...newLead, convo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newLead.notes}
                  onChange={(e) =>
                    setNewLead({ ...newLead, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={handleAddLead}
                className="bg-blue-600 text-white w-24"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={confirmOpen}
          onOpenChange={(o) => !o && setPendingId(null)}
        >
          <DialogContent className="sm:max-w-sm bg-white">
            <DialogHeader>
              <DialogTitle>Delete Lead?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              This action can’t be undone. The lead entry will be permanently
              removed.
            </p>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setPendingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="cursor-pointer bg-red-600 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Modal to view all details of a single lead */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <Card className="max-w-2xl w-full mx-auto shadow-md border mt-5 p-4 rounded-2xl bg-white max-h-[80vh] overflow-hidden">
            <CardContent className="space-y-4 overflow-y-auto max-h-[70vh]">
              <h2 className="text-xl font-semibold text-gray-800">
                Lead Details
              </h2>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-700">
                <div className="font-medium">Name:</div>
                <div>{selectedData?.name}</div>

                <div className="font-medium">Email:</div>
                <div>{selectedData?.email}</div>

                <div className="font-medium">Phone:</div>
                <div>{selectedData?.phone}</div>

                <div className="font-medium">Created Date:</div>
                <div>
                  {selectedData?.created_date
                    ? new Date(selectedData.created_date).toLocaleString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )
                    : "N/A"}
                </div>

                <div className="font-medium">Updated Date:</div>
                <div>
                  {selectedData?.updated_date
                    ? new Date(selectedData.updated_date).toLocaleString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )
                    : "N/A"}
                </div>

                <div className="font-medium">Conversation:</div>
                <div className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {selectedData?.convo}
                </div>

                <div className="font-medium">Notes:</div>
                <div className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {selectedData?.notes}
                </div>
              </div>
            </CardContent>
          </Card>
        </Modal>

        {/* Dialog for editing an existing lead */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Edit Lead
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Name <sup>*</sup>{" "}
                </label>
                <Input
                  value={editLead?.name ?? ""}
                  onChange={(e) =>
                    setEditLead({ ...editLead, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Email <sup>*</sup>
                </label>
                <Input
                  type="email"
                  value={editLead?.email ?? ""}
                  onChange={(e) =>
                    setEditLead({ ...editLead, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Phone <sup>*</sup>{" "}
                </label>
                <Input
                  type="tel"
                  value={editLead?.phone ?? ""}
                  onChange={(e) =>
                    setEditLead({ ...editLead, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Conversation</label>
                <Textarea
                  value={editLead.convo ?? ""}
                  onChange={(e) =>
                    setEditLead({ ...editLead, convo: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={editLead.notes ?? ""}
                  onChange={(e) =>
                    setEditLead({ ...editLead, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditLead({
                    id: "",
                    name: "",
                    email: "",
                    phone: "",
                    convo: "",
                    notes: "",
                    created_date: "",
                    updated_date: "",
                  });
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={handleEditLead}
                className="bg-blue-600 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DeleteModal
          rowData={rowData}
          isOpen={isOpenDeleted}
          setIsOpen={setIsOpenDeleted}
          setRowData={setRowData}
          name="leads"
          handleRefresh={handleRefresh}
        />
      </div>
    </>
  );
}
