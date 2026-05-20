import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { TicketList } from '../components/tickets/TicketList';

export default function Tickets() {
  return (
    <div>
      <Header title="My Tickets" subtitle="Track and manage your support requests" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <div /> {/* spacer */}
          <Link id="new-ticket-link" to="/tickets/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            New Ticket
          </Link>
        </div>
        <TicketList />
      </div>
    </div>
  );
}
