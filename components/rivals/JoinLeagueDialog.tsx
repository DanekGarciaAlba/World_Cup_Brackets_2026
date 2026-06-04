"use client";

import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinLeagueDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <KeyRound className="size-4" />
          Join with code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join mini-league</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input id="invite-code" placeholder="Enter code" />
          <Button onClick={() => toast.success("Join league UI ready for server action")}>Join</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
