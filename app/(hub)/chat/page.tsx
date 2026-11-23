import { PageHeader } from "@/components/ui";

export const metadata = { title: "Staff chat" };

export default function ChatPage() {
  return (
    <>
      <PageHeader
        kicker="Staff chat"
        title="Chat isn't connected yet"
        lede="When staff chat is turned on, new and overdue items can land here. Nothing is sent today."
      />
    </>
  );
}
