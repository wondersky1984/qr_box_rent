import React, { useState } from 'react';
import { api } from '../services/api';

interface YookassaConfig {
  shopId: string;
  secretKey: string;
  successUrl: string;
  failUrl: string;
  mockPayments: boolean;
}

interface PaymentResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  ykPaymentId?: string;
  confirmationUrl?: string;
  error?: string;
  stack?: string;
}

export default function YookassaTestPage() {
  const [config, setConfig] = useState<YookassaConfig | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [description, setDescription] = useState<string>('Тестовый платеж');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const checkConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test/yookassa/config');
      setConfig(response.data);
      setResult(null);
    } catch (error) {
      setResult({
        success: false,
        error: `Ошибка получения конфигурации: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    try {
      setLoading(true);
      const response = await api.post('/test/yookassa/create-payment', {
        amount,
        description,
      });
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        error: `Ошибка создания платежа: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            🧪 Тест ЮКассы
          </h1>

          <div className="space-y-6">
            {/* Конфигурация */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Конфигурация</h2>
              <button
                onClick={checkConfig}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Проверяем...' : 'Проверить конфигурацию'}
              </button>
              
              {config && (
                <div className="mt-4 p-4 bg-white rounded border">
                  <pre className="text-sm">
{`Shop ID: ${config.shopId || 'НЕ НАСТРОЕН'}
Secret Key: ${config.secretKey}
Success URL: ${config.successUrl}
Fail URL: ${config.failUrl}
Mock Payments: ${config.mockPayments}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Форма платежа */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Создание платежа</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сумма (руб.)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Описание платежа"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={createPayment}
                  disabled={loading || !amount}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Создаем...' : 'Создать платеж'}
                </button>
                
                <button
                  onClick={clearResults}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Очистить
                </button>
              </div>
            </div>

            {/* Результат */}
            {result && (
              <div className={`p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className="text-lg font-semibold mb-2">
                  {result.success ? '✅ Успешно!' : '❌ Ошибка'}
                </h3>
                
                {result.success ? (
                  <div className="space-y-2">
                    <p><strong>Order ID:</strong> {result.orderId}</p>
                    <p><strong>Payment ID:</strong> {result.paymentId}</p>
                    <p><strong>YooKassa Payment ID:</strong> {result.ykPaymentId || 'НЕ СОЗДАН'}</p>
                    {result.confirmationUrl && (
                      <div className="mt-4">
                        <p><strong>Confirmation URL:</strong></p>
                        <a
                          href={result.confirmationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {result.confirmationUrl}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-red-700 font-medium">{result.error}</p>
                    {result.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-600">
                          Stack trace
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {result.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
