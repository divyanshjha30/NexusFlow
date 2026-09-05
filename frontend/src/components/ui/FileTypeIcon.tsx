import {
  FileText,
  FileImage,
  FileAudio,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";
import type { DocumentDto } from "@/types";

export function FileTypeIcon({
  document: doc,
  className = "h-5 w-5",
}: Readonly<{
  document: Pick<DocumentDto, "mimeType" | "documentType">;
  className?: string;
}>) {
  const mime = doc.mimeType ?? "";
  if (mime.startsWith("image/")) return <FileImage className={className} />;
  if (mime.startsWith("audio/") || mime.startsWith("video/"))
    return <FileAudio className={className} />;
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return <FileSpreadsheet className={className} />;
  if (mime.includes("pdf") || mime.includes("word") || mime.startsWith("text/"))
    return <FileText className={className} />;
  return <FileIcon className={className} />;
}
