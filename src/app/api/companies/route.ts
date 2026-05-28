import { NextResponse } from "next/server";
import { listSessions } from "@/lib/rev-rec/repo";
import { createSessionFromPdfBuffers } from "@/lib/rev-rec/createFromPdfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/companies — list all customers (summary rows for the table)
export async function GET() {
  try {
    const rows = await listSessions();
    return NextResponse.json({ companies: rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/companies — create a customer from uploaded contract PDFs.
// Extracts text, infers SSA/OS roles, then kicks off Agent 1.
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with PDF files" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const companyNameInput = (form.get("company_name") as string | null)?.trim() || "";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  for (const file of files) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: `Only PDF files are accepted. Rejected: ${file.name}` },
        { status: 400 }
      );
    }
  }

  const pdfs = await Promise.all(
    files.map(async (f) => ({ filename: f.name, buf: await f.arrayBuffer() }))
  );

  try {
    const result = await createSessionFromPdfBuffers({
      company_name: companyNameInput,
      pdfs,
      meta: { source: "manual" },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
