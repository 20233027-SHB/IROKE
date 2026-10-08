import { Navigate, Route, Routes } from 'react-router';
import { Landing } from './components/Landing';
import { flowRoutes } from './flow/routes';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={flowRoutes.layout}>
        {flowRoutes.children.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
