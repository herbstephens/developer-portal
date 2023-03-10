import { Illustration } from "@/components/Auth/Illustration";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { memo, useCallback } from "react";
import { useRemoveTeamMemberMutation } from "@/hooks/useTeam";
import { TeamMemberModel } from "@/lib/models";

export interface RemoveMemberDialogProps {
  memberForRemove?: TeamMemberModel;
  onClose: () => void;
}

export const RemoveMemberDialog = memo(function RemoveMemberDialog(
  props: RemoveMemberDialogProps
) {
  const { memberForRemove, onClose } = props;
  const { removeTeamMember, isLoading } = useRemoveTeamMemberMutation();

  const handleConfirm = useCallback(async () => {
    if (!memberForRemove) return;
    await removeTeamMember(memberForRemove.id);
    onClose();
  }, [removeTeamMember, memberForRemove, onClose]);

  return (
    <Dialog
      open={!!memberForRemove}
      onClose={onClose}
      panelClassName="flex flex-col space-y-8"
    >
      <div className="flex flex-col items-center space-y-6">
        <Illustration icon="warning-triangle" color="danger" />

        <div className="flex flex-col space-y-2 text-center">
          <span className="text-24 font-sora font-semibold">
            Remove team member
          </span>

          <span className="text-14">
            Are you sure you want to remove your team member
            <b>&nbsp;{memberForRemove?.name}</b>? This will delete their
            Developer Portal account.
          </span>
        </div>
      </div>

      <Button
        variant="danger"
        className="py-4.5 px-9"
        onClick={handleConfirm}
        disabled={isLoading}
      >
        Delete member
      </Button>

      <Button variant="plain" onClick={onClose}>
        Cancel
      </Button>
    </Dialog>
  );
});