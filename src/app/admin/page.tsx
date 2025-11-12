import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar } from '@/components/sidebar'; // Import the admin Sidebar component

interface EmployeeRecord {
    name: string;
    checkInTime: string;
    checkOutTime: string;
    status: 'Checked In' | 'Checked Out' | 'Pending';
}

const mockEmployeeData: EmployeeRecord[] = [
    { name: 'John Doe', checkInTime: '09:00 AM', checkOutTime: '05:00 PM', status: 'Checked Out' },
    { name: 'Jane Smith', checkInTime: '09:15 AM', checkOutTime: '05:30 PM', status: 'Checked Out' },
    { name: 'David Lee', checkInTime: '08:45 AM', checkOutTime: 'Pending', status: 'Checked In' },
    { name: 'Sarah Jones', checkInTime: '09:30 AM', checkOutTime: 'Pending', status: 'Checked In' },
    { name: 'Michael Brown', checkInTime: '09:05 AM', checkOutTime: '05:15 PM', status: 'Checked Out' },
];

export default function AdminDashboard() {
    return (
        <div className="flex">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex-1 p-6">
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-center">
                                Welcome to the Admin Dashboard!!
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>Employee Name</TableCell>
                                <TableCell>Check-In Time</TableCell>
                                <TableCell>Check-Out Time</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockEmployeeData.map((employee, index) => (
                                <TableRow key={index}>
                                    <TableCell>{employee.name}</TableCell>
                                    <TableCell>{employee.checkInTime}</TableCell>
                                    <TableCell>{employee.checkOutTime}</TableCell>
                                    <TableCell>{employee.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
