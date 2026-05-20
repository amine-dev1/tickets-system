import { Header } from '../components/layout/Header';
import { TicketDetail } from '../components/tickets/TicketDetail';

export default function TicketDetailPage() {
  return (
    <div>
      <Header title="Ticket Details" />
      <div className="p-6">
        <TicketDetail />
      </div>
    </div>
  );
}
