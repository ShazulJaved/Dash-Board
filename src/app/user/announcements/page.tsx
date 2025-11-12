'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Upload, FileText, Download, Pin, CheckCircle, XCircle, Clock, AlertCircle, Send, RefreshCw } from "lucide-react";
// Sample Data (Replace with API calls in production)
const initialAnnouncements = [
  {
    id: "1",
    title: "System Maintenance",
    content: "Scheduled maintenance on Saturday.",
    type: 'INFO',
    isActive: true,
    pinned: false,
    createdAt: new Date().toISOString(),
    author: { name: "Admin", email: "admin@example.com" },
    files: [],
  },
  {
    id: "2",
    title: "Security Alert",
    content: "Please update your password.",
    type: 'URGENT',
    isActive: true,
    pinned: true,
    createdAt: new Date().toISOString(),
    author: { name: "Admin", email: "admin@example.com" },
    files: [],
  },
];

const initialDocuments = [
  {
    id: "doc1",
    title: "ID Proof",
    description: "My government ID",
    fileName: "id_proof.pdf",
    fileUrl: "/files/id_proof.pdf",
    fileSize: 102400,
    fileType: "application/pdf",
    status: 'REVIEWED',
    createdAt: new Date().toISOString(),
    user: { name: "User", email: "user@example.com" },
  },
];

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [documents, setDocuments] = useState(initialDocuments);
  const [activeTab, setActiveTab] = useState<"announcements" | "documents">("announcements");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(true);


  // Handlers
  const handlePinAnnouncement = (id: string) => {
    setAnnouncements(prev =>
      prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a)
    );
  };

  const handleDocumentSubmit = (newDoc: any) => {
    setDocuments(prev => [...prev, newDoc]);
    setShowUploadModal(false);
  };

  const handleRefresh = () => {
    // In real app, re-fetch data
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.pinned ? -1 : 1;
  });
  

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 
      absolute h-[30%] bg-gradient-to-b from-teal-900/60 to-emerald-800/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-xl">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white bg-clip-text">Announcements & Documents</h1>
              <p className="text-white">Stay updated and submit documents to admin</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
              <div className="text-sm text-white">Unread</div>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Submit Document</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border mb-8">
          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-colors ${
              activeTab === "announcements"
                ? "bg-blue-100 text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Announcements ({announcements.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-colors ${
              activeTab === "documents"
                ? "bg-green-100 text-green-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>My Documents ({documents.length})</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "announcements" ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {sortedAnnouncements.map((announcement) => (
                    <AnnouncementItem
                      key={announcement.id}
                      announcement={announcement}
                      onPin={handlePinAnnouncement}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <DocumentsList documents={documents} loading={false} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats & Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Quick Stats</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Announcements:</span>
                  <span className="font-semibold">{announcements.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unread:</span>
                  <span className="font-semibold text-blue-600">{unreadCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pinned:</span>
                  <span className="font-semibold text-yellow-600">
                    {announcements.filter(a => a.pinned).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">My Submissions:</span>
                  <span className="font-semibold text-green-600">{documents.length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Quick Actions</span>
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Submit New Document</span>
                </button>
                <button
                  onClick={() => setActiveTab("documents")}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>View My Submissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for submitting document */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={(doc) => handleDocumentSubmit(doc)}
        />
      )}
    </div>
  );
}

// Announcement Item Component
function AnnouncementItem({ announcement, onPin }: { announcement: any; onPin: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeStyles = (type: string) => {
    const styles: any = {
      INFO: "border-blue-200 bg-blue-50 text-blue-800",
      WARNING: "border-yellow-200 bg-yellow-50 text-yellow-800",
      URGENT: "border-red-200 bg-red-50 text-red-800",
      SUCCESS: "border-green-200 bg-green-50 text-green-800",
    };
    return styles[type] || styles.INFO;
  };

  const getTypeIcon = (type: string) => {
    const icons: any = {
      INFO: "💡",
      WARNING: "⚠️",
      URGENT: "🚨",
      SUCCESS: "✅",
    };
    return icons[type] || "💡";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`border-l-4 rounded-lg p-4 shadow-sm cursor-pointer transition-all duration-200 ${getTypeStyles(announcement.type)}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-lg">{getTypeIcon(announcement.type)}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{announcement.title}</h3>
            <p className="text-sm opacity-75">
              By {announcement.author.name} • {new Date(announcement.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {announcement.files.length > 0 && <FileText className="w-4 h-4 text-gray-500" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin(announcement.id);
            }}
            className={`p-1 rounded-full transition-colors ${announcement.pinned ? "text-yellow-500 bg-yellow-100" : "text-gray-400 hover:text-yellow-500"}`}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3"
          >
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-line">{announcement.content}</p>
            </div>
            {/* Files could be listed here if needed */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Documents List
function DocumentsList({ documents, loading }: { documents: any[]; loading: boolean }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "REJECTED": return <XCircle className="w-4 h-4 text-red-600" />;
      case "REVIEWED": return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "REVIEWED": return "bg-blue-100 text-blue-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No documents submitted</h3>
        <p className="text-gray-500">Submit your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <FileText className="w-5 h-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                {doc.description && (
                  <p className="text-gray-600 text-sm mt-1">{doc.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>File: {doc.fileName}</span>
                  <span>Size: {formatFileSize(doc.fileSize)}</span>
                  <span>Submitted: {new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(doc.status)}`}>
                {getStatusIcon(doc.status)}
                <span>{doc.status}</span>
              </div>
              <button
                onClick={() => window.open(doc.fileUrl, "_blank")}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Document upload modal (simulate adding document)
function DocumentUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (doc: any) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = () => {
    if (title && file) {
      const newDoc = {
        id: Math.random().toString(),
        title,
        description,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileSize: file.size,
        fileType: file.type,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        user: { name: "User", email: "user@example.com" },
      };
      onSuccess(newDoc);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">Submit Document</h2>
        <input
          type="text"
          placeholder="Title"
          className="w-full border p-2 rounded mb-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          className="w-full border p-2 rounded mb-2"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="file"
          className="mb-4"
          onChange={handleFileChange}
        />
        <div className="flex justify-end space-x-2">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
   }
