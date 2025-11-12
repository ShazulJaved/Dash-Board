"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { Megaphone, Trash2, Send, FileIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Announcement {
  id: string;
  title: string;
  message: string;
  sendToAll: boolean;
  targetUsers: string[];
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Welcome Demo",
      message: "This is a static announcement for UI preview.",
      sendToAll: true,
      targetUsers: [],
    },
  ]);

  const [documents] = useState([
    {
      id: "doc1",
      fileName: "User-ID.pdf",
      uploadedBy: "Ahmed Ali",
      date: "Nov 10, 2025",
    },
    {
      id: "doc2",
      fileName: "Task.docx",
      uploadedBy: "Sara Khan",
      date: "Nov 09, 2025",
    },
  ]);

  const [users] = useState([
    { id: "u1", name: "Ahmed Ali" },
    { id: "u2", name: "Sara Khan" },
    { id: "u3", name: "John Doe" },
  ]);

  const [form, setForm] = useState({
    title: "",
    message: "",
    sendToAll: true,
    targetUsers: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return alert("Please fill all fields!");

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      ...form,
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);

    setForm({ title: "", message: "", sendToAll: true, targetUsers: [] });
  };

  const handleDelete = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-8 space-y-10 max-w-5xl mx-auto min-h-secrren">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <Megaphone /> Announcement Management 
      </h1>

      {/* ✅ Announcement Form */}
      <GlassCard className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Announcement title..."
            className="w-full p-3 border rounded-xl outline-none"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Write announcement message..."
            className="w-full p-3 border rounded-xl resize-none"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />

          {/* ✅ Send to All or Selected */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target"
                checked={form.sendToAll}
                onChange={() =>
                  setForm({ ...form, sendToAll: true, targetUsers: [] })
                }
              />
              Send to All Users
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target"
                checked={!form.sendToAll}
                onChange={() => setForm({ ...form, sendToAll: false })}
              />
              Send to Selected Users
            </label>
          </div>

          {/* ✅ Multi-Select Users */}
          {!form.sendToAll && (
            <select
              multiple
              className="w-full p-3 border rounded-xl"
              value={form.targetUsers}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetUsers: Array.from(
                    e.target.selectedOptions,
                    (opt) => opt.value
                  ),
                })
              }
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="px-6 py-3 bg-teal-400 hover:bg-teal-200 text-white rounded-xl flex items-center gap-2"
          >
            <Send size={18} /> Post Announcement
          </button>
        </form>
      </GlassCard>

      {/* ✅ Announcements List */}
      <div className="space-y-4">
        {announcements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-white border rounded-xl shadow flex justify-between"
          >
            <div>
              <h3 className="font-semibold text-black-600">{a.title}</h3>
              <p className="text-gray-700">{a.message}</p>
              <small className="text-gray-500 block mt-1">
                {a.sendToAll
                  ? "Sent to All Users"
                  : `Sent to ${a.targetUsers.length} users`}
              </small>
            </div>
            <button onClick={() => handleDelete(a.id)}>
              <Trash2 className="text-black-500" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* ✅ Documents From Users */}
      <GlassCard className="p-6 space-y-4">
        <h2 className="text-xl font-bold">User Submitted Documents</h2>

        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-4 bg-white border rounded-xl shadow flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <FileIcon className="text-black-600" />
              <div>
                <p className="font-medium">{doc.fileName}</p>
                <small className="text-gray-500">
                  {doc.uploadedBy} — {doc.date}
                </small>
              </div>
            </div>
            <button className="px-4 py-2 bg-teal-500 text-black rounded-lg">
              Download
            </button>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
