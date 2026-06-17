import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function ReportsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Reports & Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Attendance Report">
          <p className="text-gray-600 mb-4">Generate attendance reports by date range, class, or student.</p>
          <Button variant="primary" size="sm">Generate Report</Button>
        </Card>
        
        <Card title="Academic Report">
          <p className="text-gray-600 mb-4">View academic performance and grade summaries.</p>
          <Button variant="primary" size="sm">View Academics</Button>
        </Card>
        
        <Card title="System Usage">
          <p className="text-gray-600 mb-4">Monitor system usage and user activity statistics.</p>
          <Button variant="primary" size="sm">View Usage</Button>
        </Card>
      </div>
      
      <Card title="Recent Reports">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Generated Reports</h4>
            <Button variant="secondary" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">Monthly Attendance Report - November 2024</div>
                <div className="text-sm text-gray-500">Generated on Dec 1, 2024</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Download</Button>
                <Button variant="primary" size="sm">View</Button>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">Academic Performance Report - Q3 2024</div>
                <div className="text-sm text-gray-500">Generated on Nov 15, 2024</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Download</Button>
                <Button variant="primary" size="sm">View</Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
