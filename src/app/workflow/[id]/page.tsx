import type { Metadata } from 'next';
import WorkflowBuilder from '../../../WorkflowBuilder';

export const metadata: Metadata = {
  title: 'Workflow Builder',
  robots: { index: false, follow: false },
};

export default function WorkflowPage() {
  return <WorkflowBuilder />;
}
