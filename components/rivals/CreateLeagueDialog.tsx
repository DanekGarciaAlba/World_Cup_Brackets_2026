"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateLeagueDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Create mini-league
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create mini-league</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Label htmlFor="league-name">League name</Label>
          <Input id="league-name" placeholder="Office league" />
          <Button onClick={() => toast.success("Mini-league creation UI ready for server action")}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
