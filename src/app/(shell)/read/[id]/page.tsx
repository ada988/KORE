import ReaderClient from "./ReaderClient";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return [
    { id: "demo-genesis" },
    { id: "demo-tech" },
    { id: "demo-brain" },
    { id: "demo-society" },
    { id: "demo-literary" },
  ];
}

export default function ReaderPage({ params }: PageProps) {
  return <ReaderClient params={params} />;
}
