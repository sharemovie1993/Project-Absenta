import { useRoutes } from 'react-router-dom';
import { parentRoutes } from './routes';
import { ParentSocketProvider } from './providers/ParentSocketProvider';

function ParentRoutes() {
  return useRoutes(parentRoutes);
}

export default function App() {
  return (
    <ParentSocketProvider>
      <ParentRoutes />
    </ParentSocketProvider>
  );
}
