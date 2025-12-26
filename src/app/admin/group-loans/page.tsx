
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, ChevronDown, User, IndianRupee, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore } from '@/firebase';
import { useState, useMemo } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type GroupLoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  totalRepayment: number;
  repaymentType: 'EMI' | 'Monthly' | 'One-Time';
  duration: number;
  durationType: DurationType;
  amountFunded: number;
  status: 'Funding' | 'Active' | 'Completed';
  amountRepaid?: number;
};

type Investment = {
    id: string;
    investorId: string;
    investorName: string;
    investedAmount: number;
    amountReceived: number;
}

type Repayment = {
    id: string;
    amount: number;
    repaymentDate: Timestamp;
    status: 'Pending Distribution' | 'Distributed';
}

const emptyPlan: Omit<GroupLoanPlan, 'id' | 'amountFunded' | 'status' | 'amountRepaid'> = {
  name: '',
  loanAmount: 0,
  interest: 0,
  totalRepayment: 0,
  repaymentType: 'Monthly',
  duration: 1,
  durationType: 'Months',
};

export default function GroupLoansPage() {
  const { data: plans, loading } = useCollection<GroupLoanPlan>('groupLoanPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<GroupLoanPlan> | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(emptyPlan);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: GroupLoanPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      await deleteDoc(doc(firestore, 'groupLoanPlans', planId));
      toast({ title: 'Group Loan Plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting plan: ', error);
      toast({
        title: 'Error deleting plan',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    const planToSave = {
      ...editingPlan,
      totalRepayment: (editingPlan.loanAmount || 0) + (editingPlan.interest || 0),
      amountFunded: editingPlan.amountFunded || 0,
      status: editingPlan.status || 'Funding',
      amountRepaid: editingPlan.amountRepaid || 0,
    };

    try {
      if ('id' in planToSave && planToSave.id) {
        const planRef = doc(firestore, 'groupLoanPlans', planToSave.id);
        const { id, ...planData } = planToSave;
        await updateDoc(planRef, planData);
        toast({ title: 'Group Loan Plan updated successfully' });
      } else {
        await addDoc(collection(firestore, 'groupLoanPlans'), planToSave);
        toast({ title: 'Group Loan Plan created successfully' });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan: ', error);
      toast({ title: 'Error saving plan', variant: 'destructive' });
    }
  };

  const handleFieldChange = (field: keyof typeof emptyPlan, value: any) => {
    if (!editingPlan) return;
    const parsedValue = ['loanAmount', 'interest', 'duration'].includes(field) && typeof value === 'string'
      ? parseFloat(value)
      : value;
    setEditingPlan({ ...editingPlan, [field]: parsedValue });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Group Loan Plans</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      <div className="space-y-4">
        {loading ? (
            <p>Loading plans...</p>
        ) : plans && plans.length > 0 ? (
            plans.map(plan => <PlanDetails key={plan.id} plan={plan} onEdit={handleEdit} onDelete={handleDelete} />)
        ) : (
            <p className='text-center text-muted-foreground'>No group loan plans found.</p>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlan && 'id' in editingPlan ? 'Edit Group Loan Plan' : 'Create New Group Loan Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {Object.keys(emptyPlan).map((key) => {
                const fieldKey = key as keyof typeof emptyPlan;
                if (fieldKey === 'durationType') return null;
                if (fieldKey === 'duration') {
                    return (
                        <div className="grid grid-cols-4 items-center gap-4" key={key}>
                            <Label htmlFor={key} className="text-right capitalize">{key}</Label>
                            <Input
                                id={key}
                                type="number"
                                value={editingPlan?.[fieldKey] || 1}
                                onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                className="col-span-2"
                            />
                            <Select
                                value={editingPlan?.durationType || 'Months'}
                                onValueChange={(value: DurationType) => handleFieldChange('durationType', value)}
                            >
                                <SelectTrigger className="col-span-1">
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Days">Days</SelectItem>
                                    <SelectItem value="Weeks">Weeks</SelectItem>
                                    <SelectItem value="Months">Months</SelectItem>
                                    <SelectItem value="Years">Years</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    );
                }
                 if (fieldKey === 'repaymentType') {
                    return (
                        <div className="grid grid-cols-4 items-center gap-4" key={key}>
                            <Label htmlFor={key} className="text-right capitalize">Repayment</Label>
                            <Select
                                value={editingPlan?.repaymentType || 'Monthly'}
                                onValueChange={(value: any) => handleFieldChange(fieldKey, value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                    <SelectItem value="EMI">EMI</SelectItem>
                                    <SelectItem value="One-Time">One-Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )
                 }

                return (
                     <div className="grid grid-cols-4 items-center gap-4" key={key}>
                        <Label htmlFor={key} className="text-right capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                        </Label>
                        <Input
                            id={key}
                            value={editingPlan?.[fieldKey] || ''}
                            type={typeof emptyPlan[fieldKey] === 'number' ? 'number' : 'text'}
                            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                )
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function PlanDetails({ plan, onEdit, onDelete }: { plan: GroupLoanPlan, onEdit: (plan: GroupLoanPlan) => void, onDelete: (id: string) => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: investments, loading: investmentsLoading } = useCollection<Investment>(`groupLoanPlans/${plan.id}/investments`);
    const { data: repayments, loading: repaymentsLoading } = useCollection<Repayment>(`groupLoanPlans/${plan.id}/repayments`);
    
    const [payoutAmount, setPayoutAmount] = useState(0);
    const [selectedInvestor, setSelectedInvestor] = useState('');
    const [repaymentAmount, setRepaymentAmount] = useState(0);

    const fundingProgress = useMemo(() => (plan.amountFunded / plan.loanAmount) * 100, [plan.amountFunded, plan.loanAmount]);
    
    const totalRepaidByBorrower = useMemo(() => plan.amountRepaid || 0, [plan.amountRepaid]);
    const repaymentProgress = useMemo(() => (totalRepaidByBorrower / plan.totalRepayment) * 100, [totalRepaidByBorrower, plan.totalRepayment]);
    
    const remainingRepayment = plan.totalRepayment - totalRepaidByBorrower;

    const distributableAmount = useMemo(() => {
        if (!repayments) return 0;
        return repayments
            .filter(r => r.status === 'Pending Distribution')
            .reduce((sum, r) => sum + r.amount, 0);
    }, [repayments]);

    const isFullyRepaid = remainingRepayment <= 0;

    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'Funding': return 'secondary';
            case 'Active': return 'default';
            case 'Completed': return 'outline';
            default: return 'secondary';
        }
    }
    
    const formatDate = (timestamp: Timestamp | undefined) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const handleRecordRepayment = async () => {
        if (repaymentAmount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a positive amount.', variant: 'destructive'});
            return;
        }
        if (repaymentAmount > remainingRepayment) {
            toast({ title: 'Amount Exceeds Balance', description: `Cannot log more than the remaining ₹${remainingRepayment.toFixed(2)}.`, variant: 'destructive'});
            return;
        }

        const batch = writeBatch(firestore);
        
        // Log the repayment
        const repaymentRef = doc(collection(firestore, 'groupLoanPlans', plan.id, 'repayments'));
        batch.set(repaymentRef, {
            loanPlanId: plan.id,
            amount: repaymentAmount,
            repaymentDate: serverTimestamp(),
            status: 'Pending Distribution'
        });

        // Update the total amount repaid on the plan itself
        const planRef = doc(firestore, 'groupLoanPlans', plan.id);
        const newAmountRepaid = totalRepaidByBorrower + repaymentAmount;
        const isCompleted = newAmountRepaid >= plan.totalRepayment;

        batch.update(planRef, { 
            amountRepaid: newAmountRepaid,
            ...(isCompleted && { status: 'Completed' })
         });

        try {
            await batch.commit();
            toast({ title: 'Repayment Logged', description: 'Repayment is now pending for distribution.'});
            setRepaymentAmount(0);
        } catch (e) {
            console.error(e);
            toast({title: 'Error', variant: 'destructive'});
        }
    }

    const handleDistributePayout = async () => {
        if (payoutAmount <= 0 || !selectedInvestor) {
            toast({ title: 'Invalid Input', description: 'Select an investor and enter a valid amount.', variant: 'destructive'});
            return;
        }

        if (payoutAmount > distributableAmount) {
            toast({ title: 'Payout exceeds available funds', description: `You can only distribute up to ₹${distributableAmount.toFixed(2)}.`, variant: 'destructive'});
            return;
        }

        const investor = investments?.find(i => i.id === selectedInvestor);
        if (!investor) return;

        const batch = writeBatch(firestore);

        // Update investor's received amount
        const investmentRef = doc(firestore, 'groupLoanPlans', plan.id, 'investments', investor.id);
        batch.update(investmentRef, {
            amountReceived: (investor.amountReceived || 0) + payoutAmount
        });

        // Log the payout
        const payoutRef = doc(collection(firestore, 'groupLoanPlans', plan.id, 'payouts'));
        batch.set(payoutRef, {
            payoutId: payoutRef.id,
            loanPlanId: plan.id,
            investorId: investor.id,
            investorName: investor.investorName,
            payoutAmount: payoutAmount,
            payoutDate: serverTimestamp(),
        });
        
        let amountToDeduct = payoutAmount;
        const pendingRepayments = (repayments || []).filter(r => r.status === 'Pending Distribution').sort((a,b) => a.repaymentDate?.seconds - b.repaymentDate?.seconds);

        for (const repayment of pendingRepayments) {
            if (amountToDeduct <= 0) break;

            const repaymentRef = doc(firestore, 'groupLoanPlans', plan.id, 'repayments', repayment.id);
            const availableInThisRepayment = repayment.amount; // Simplified assumption

            // This logic is simplified for demo. A real app would need to handle partial distributions
            // from a single repayment log or consolidate them.
            if(amountToDeduct >= availableInThisRepayment) {
                batch.update(repaymentRef, { status: 'Distributed' });
                amountToDeduct -= availableInThisRepayment;
            } else {
                 toast({title: 'Partial Distribution Logic Simplified', description: `Distributing ₹${payoutAmount}. Please ensure this aligns with your logged repayments.`, variant: 'default'});
                 break; 
            }
        }
        
        try {
            await batch.commit();
            toast({ title: 'Payout Distributed', description: `₹${payoutAmount} sent to ${investor.investorName}`});
            setPayoutAmount(0);
            setSelectedInvestor('');
        } catch(e) {
            console.error(e);
            toast({title: 'Payout Failed', variant: 'destructive'});
        }
    }
    
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <span>{plan.name}</span>
                    <Badge variant={getStatusVariant(plan.status)}>{plan.status}</Badge>
                </CardTitle>
                <CardDescription>
                    Goal: ₹{plan.loanAmount.toFixed(2)} | Total Repayment: ₹{plan.totalRepayment.toFixed(2)}
                </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => onDelete(plan.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                    <span>Funding Progress</span>
                    <span>₹{plan.amountFunded.toFixed(2)}</span>
                </div>
                <Progress value={fundingProgress} />
            </div>
            
            {plan.status !== 'Funding' && (
                <div>
                     <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                        <span>Repayment Progress</span>
                        <span>Repaid: ₹{totalRepaidByBorrower.toFixed(2)} | Pending: ₹{remainingRepayment.toFixed(2)}</span>
                    </div>
                    <Progress value={repaymentProgress} className='[&>div]:bg-green-500'/>
                </div>
            )}

            <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                        View Details & Actions <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="py-4 space-y-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/>Investors</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Invested</TableHead>
                                        <TableHead>Received</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {investmentsLoading ? <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
                                    : investments && investments.length > 0 ? investments.map(inv => (
                                        <TableRow key={inv.id}>
                                            <TableCell>{inv.investorName}</TableCell>
                                            <TableCell>₹{(inv.investedAmount || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-green-400">₹{(inv.amountReceived || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className='text-center'>No investors yet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h4 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4"/>Record Borrower Repayment</h4>
                            {isFullyRepaid ? (
                                <div className='text-center text-green-500 font-bold p-4 border rounded-md'>Loan Fully Repaid!</div>
                            ) : (
                                <div className="flex gap-2">
                                    <Input type="number" placeholder="Amount received" value={repaymentAmount || ''} onChange={e => setRepaymentAmount(parseFloat(e.target.value))} />
                                    <Button onClick={handleRecordRepayment}>Log</Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                             <h4 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4"/>Distribute Payout</h4>
                            <p className='text-sm text-muted-foreground'>Available to distribute: <span className='font-bold text-primary'>₹{distributableAmount.toFixed(2)}</span></p>
                             <div className="flex gap-2">
                                <Select onValueChange={setSelectedInvestor} value={selectedInvestor}>
                                    <SelectTrigger><SelectValue placeholder="Select Investor"/></SelectTrigger>
                                    <SelectContent>
                                        {investments?.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.investorName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input type="number" placeholder="Payout amount" value={payoutAmount || ''} onChange={e => setPayoutAmount(parseFloat(e.target.value))}/>
                                <Button onClick={handleDistributePayout} disabled={payoutAmount <= 0 || !selectedInvestor}>Pay</Button>
                             </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2"><History className="h-4 w-4"/>Borrower Repayment History</h4>
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repaymentsLoading ? <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow> 
                                    : repayments && repayments.length > 0 ? repayments.map(rep => (
                                        <TableRow key={rep.id}>
                                            <TableCell>₹{rep.amount.toFixed(2)}</TableCell>
                                            <TableCell>{formatDate(rep.repaymentDate)}</TableCell>
                                            <TableCell><Badge variant={rep.status === 'Distributed' ? 'outline' : 'secondary'}>{rep.status}</Badge></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className='text-center'>No repayments logged yet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </CardContent>
      </Card>
    )
}
