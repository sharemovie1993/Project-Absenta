import { Navigate, useSearchParams } from 'react-router-dom';

export default function ParentRootRedirect() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  if (token) {
    return <Navigate to={`access?token=${token}`} replace />;
  }
  
  return <div>Parent Root - Please use /access link</div>;
}

