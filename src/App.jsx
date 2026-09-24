import { useState } from 'react';
import BottomNav from './components/BottomNav';
import DashboardPage from './pages/DashboardPage';
import WorkLogPage from './pages/WorkLogPage';
import SchedulePage from './pages/SchedulePage';
import InvoicePage from './pages/InvoicePage';
import './App.css';

function App() {
  const [tab, setTab] = useState('dashboard');

  const handleEditRecord = () => {
    setTab('worklog');
  };

  return (
    <div className="app">
      {tab === 'dashboard' && <DashboardPage onNavigate={setTab} />}
      {tab === 'worklog' && <WorkLogPage />}
      {tab === 'schedule' && <SchedulePage />}
      {tab === 'invoice' && <InvoicePage onEditRecord={handleEditRecord} />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
