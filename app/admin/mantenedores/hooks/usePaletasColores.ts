import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPaletasColores,
  createPaletaColor,
  updatePaletaColor,
  deletePaletaColor,
  PaletaColor,
} from "../lib/api/paletas_colores";

export function usePaletasColores() {
  const queryClient = useQueryClient();
  const queryKey = ["paletas_colores"];

  const query = useQuery<PaletaColor[]>({
    queryKey,
    queryFn: fetchPaletasColores,
  });

  const create = useMutation({
    mutationFn: createPaletaColor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PaletaColor> }) =>
      updatePaletaColor(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: deletePaletaColor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...query,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}
