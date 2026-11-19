import { Link } from 'react-router';
import { Shell } from '../Shell';
export function NotFound() {
  return <Shell title="Not found"><div className="empty-d"><h3>This page doesn’t exist</h3><p>The workspace may have been deleted from this browser.</p><Link to="/workspaces" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go to workspaces</Link></div></Shell>;
}
