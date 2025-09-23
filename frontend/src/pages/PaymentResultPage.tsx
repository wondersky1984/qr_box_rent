import { Link, useParams } from 'react-router-dom';

export const PaymentResultPage = () => {
  const { status } = useParams();
  const success = status === 'success';

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded border border-slate-800 bg-slate-900/40 p-8 text-center">
      <div className={`text-4xl font-semibold ${success ? 'text-emerald-400' : 'text-rose-400'}`}>
        {success ? 'Оплата прошла' : 'Оплата не выполнена'}
      </div>
      <p className="text-sm text-slate-400">
        {success
          ? 'Вы можете открыть арендованные ячейки на странице «Мои ячейки».'
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
