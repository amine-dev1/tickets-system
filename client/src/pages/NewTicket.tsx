import { Header } from '../components/layout/Header';
import { TicketForm } from '../components/tickets/TicketForm';

export default function NewTicket() {
  return (
    <div>
      <Header title="New Ticket" subtitle="Submit a new support request" />
      <div className="p-6">
        <TicketForm />
      </div>
    </div>
  );
}
