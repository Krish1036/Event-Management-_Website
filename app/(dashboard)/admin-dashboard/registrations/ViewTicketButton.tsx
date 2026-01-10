"use client";

interface ViewTicketButtonProps {
  registration: {
    user?: { full_name?: string | null; email?: string | null } | null;
    event?: { title?: string | null; is_paid?: boolean | null; price?: number | null } | null;
    status?: string | null;
    entry_code?: string | null;
    created_at: string;
  };
}

export function ViewTicketButton({ registration }: ViewTicketButtonProps) {
  const handleClick = () => {
    const userName = registration.user?.full_name ?? "User";
    const email = registration.user?.email ?? "No email";
    const entryCode = registration.entry_code ?? "N/A";
    const eventTitle = registration.event?.title ?? "Event";
    const status = registration.status ?? "UNKNOWN";
    const createdAt = new Date(registration.created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
    const pricePart = registration.event?.is_paid
      ? `Price: ₹${registration.event.price}`
      : "Free event";

    // Simple alert view, same content as before
    alert(
      `Ticket view for ${userName} - Entry Code: ${entryCode}\n\n` +
        `Event: ${eventTitle}\n` +
        `Status: ${status}\n` +
        `Email: ${email}\n` +
        `Registered: ${createdAt}\n` +
        pricePart
    );
  };

  return (
    <button
      type="button"
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
      onClick={handleClick}
    >
      View Ticket
    </button>
  );
}
