import { Header } from '../../components/layout/Header';
import { TicketList } from '../../components/tickets/TicketList';

export default function AdminTickets() {
  return (
    <div>
      <Header title="All Tickets" subtitle="Manage, filter, and respond to all client tickets" />
      <div className="p-6">
        <TicketList />
      </div>
    </div>
  );
}
