import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmPayment } from '../services/payments';
import { toast } from '../components/ui/useToast';

export const PaymentResultPage = () => {
  const { status } = useParams();
  const success = status === 'success';
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const queryClient = useQueryClient();
  const triggeredRef = useRef(false);

  const { mutate: confirmPaymentMutate, isPending: isProcessing } = useMutation({
    mutationFn: (id: string) => confirmPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: () => {
      toast.error('Не удалось подтвердить оплату');
    },
  });

  useEffect(() => {
    if (!success || triggeredRef.current) return;
    triggeredRef.current = true;
    if (paymentId) {
      confirmPaymentMutate(paymentId);
    } else {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    }
  }, [success, paymentId, confirmPaymentMutate, queryClient]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded border border-slate-800 bg-slate-900/40 p-8 text-center">
      <div className={`text-4xl font-semibold ${success ? 'text-emerald-400' : 'text-rose-400'}`}>
        {success ? 'Оплата прошла' : 'Оплата не выполнена'}
      </div>
      <p className="text-sm text-slate-400">
        {success
          ? isProcessing
            ? 'Подтверждаем оплату, подождите...'
            : 'Вы можете открыть арендованные ячейки на странице «Мои ячейки».'
          : 'Попробуйте повторить оплату или выберите другой способ.'}
      </p>
      <div className="flex gap-4">
        <Link className="text-sm text-emerald-400 hover:text-emerald-300" to="/">
          Вернуться к выбору ячеек
        </Link>
        <Link className="text-sm text-slate-300 hover:text-white" to="/rentals">
          Мои ячейки
        </Link>
      </div>
    </div>
  );
};
