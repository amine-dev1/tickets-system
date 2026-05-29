import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { TicketList } from '../../components/tickets/TicketList';
import { NewTicketModal } from '../../components/tickets/NewTicketModal';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminTickets() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <Header title="All Tickets" subtitle="Manage, filter, and respond to all client tickets" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <div /> {/* Spacer */}
          <button 
            id="new-ticket-btn-admin" 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <PlusCircle className="w-4 h-4" />
            New Ticket
          </button>
        </div>
        <TicketList />
      </div>
      <NewTicketModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(ticketId) => {
          setIsModalOpen(false);
          navigate(`/admin/tickets/${ticketId}`);
        }} 
      />
    </div>
  );
}
