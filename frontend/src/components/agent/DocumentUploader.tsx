import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const documentCategoryOptions = [
  { value: "purchase_agreement", label: "Purchase agreement" },
  { value: "inspection_report", label: "Inspection report" },
  { value: "disclosure", label: "Disclosure" },
  { value: "hoa", label: "HOA packet" },
  { value: "generic", label: "Generic" }
] as const;

interface DocumentUploaderProps {
  token: string;
  transactionId: string;
}

export function DocumentUploader({ token, transactionId }: DocumentUploaderProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof documentCategoryOptions)[number]["value"]>("purchase_agreement");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolvedTitle = useMemo(() => {
    if (title.trim()) {
      return title.trim();
    }

    if (selectedFile) {
      return selectedFile.name.replace(/\.pdf$/i, "");
    }

    return "";
  }, [selectedFile, title]);

  function resetAfterUpload() {
    setTitle("");
    setSelectedFile(null);
    setCategory("purchase_agreement");
  }

  function handleFileSelection(file: File | null) {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError("Choose a PDF before uploading.");
      return;
    }

    if (!resolvedTitle) {
      setError("Add a document title before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("transactionId", transactionId);
      formData.append("title", resolvedTitle);
      formData.append("category", category);
      formData.append("file", selectedFile);

      await api.post("/api/agent/documents/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage("Upload complete. The summary is ready and clients polling this transaction will see it shortly.");
      resetAfterUpload();

      await queryClient.invalidateQueries({
        queryKey: ["agent", "transaction-documents", transactionId, token]
      });
      await queryClient.invalidateQueries({
        queryKey: ["agent", "transactions", token]
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <UploadCloud className="h-5 w-5 text-primary" />
          Upload Document
        </CardTitle>
        <CardDescription>
          Drag in a PDF, pick the document type, and Closing Day will extract text and generate a plain-English summary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "rounded-[28px] border border-dashed px-6 py-8 text-center transition",
            isDragging ? "border-primary bg-teal-50" : "border-slate-300 bg-slate-50"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFileSelection(event.dataTransfer.files[0] ?? null);
          }}
        >
          <FileUp className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            {selectedFile ? selectedFile.name : "Drop a PDF here or choose one from your computer"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Recommended for purchase agreements, inspection reports, disclosures, and HOA docs.</p>
          <Input
            className="mt-4"
            accept="application/pdf"
            type="file"
            onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="document-title">
              Title
            </label>
            <Input
              id="document-title"
              placeholder="Inspection report - 4421 Olive St"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="document-category">
              Category
            </label>
            <select
              id="document-category"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/40"
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof documentCategoryOptions)[number]["value"])}
            >
              {documentCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <Button className="w-full" disabled={isUploading} onClick={handleSubmit} type="button">
          {isUploading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Uploading and summarizing...
            </>
          ) : (
            "Upload PDF"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
