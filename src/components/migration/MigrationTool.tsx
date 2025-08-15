"use client";

import React, { useState } from 'react';
import { Download, Upload, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  exportLocalStorageData, 
  downloadLocalStorageBackup, 
  migrateLocalStorageData,
  clearLocalStorageData,
  type LocalStorageData
} from '@/lib/data-migration';

export const MigrationTool: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const localData = exportLocalStorageData();
  const hasLocalData = localData && (localData.rootTask || localData.teams);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      downloadLocalStorageBackup();
    } finally {
      setIsExporting(false);
    }
  };

  const handleMigrate = async () => {
    if (!localData) return;
    
    setIsMigrating(true);
    setMigrationStatus('idle');
    setErrorMessage('');
    
    try {
      await migrateLocalStorageData(localData);
      setMigrationStatus('success');
    } catch (error: any) {
      setMigrationStatus('error');
      setErrorMessage(error.message || 'Error durante la migración');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLocal = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar todos los datos locales? Esta acción no se puede deshacer.')) {
      clearLocalStorageData();
      window.location.reload();
    }
  };

  if (!hasLocalData) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full shadow-lg"
          title="Migrar datos locales"
        >
          <Upload className="h-5 w-5" />
        </button>
      )}

      {isVisible && (
        <div className="bg-white rounded-lg shadow-xl border max-w-sm w-80">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Herramienta de Migración
              </h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Datos locales detectados</p>
                <p>Se encontraron datos guardados en tu navegador. Puedes migrarlos a la base de datos.</p>
              </div>
            </div>

            {localData && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>Datos encontrados:</strong></p>
                <ul className="mt-1 space-y-1">
                  {localData.rootTask && (
                    <li>• Tareas: {localData.rootTask.subtasks?.length || 0} tareas principales</li>
                  )}
                  {localData.teams && (
                    <li>• Equipos: {localData.teams.length} equipos</li>
                  )}
                  {localData.userName && (
                    <li>• Usuario: {localData.userName}</li>
                  )}
                </ul>
              </div>
            )}

            {migrationStatus === 'success' && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-800 rounded">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">Migración completada exitosamente</span>
              </div>
            )}

            {migrationStatus === 'error' && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 text-red-800 rounded">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Error en la migración</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? 'Exportando...' : 'Crear respaldo'}</span>
              </button>

              <button
                onClick={handleMigrate}
                disabled={isMigrating || migrationStatus === 'success'}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {isMigrating ? 'Migrando...' : 
                   migrationStatus === 'success' ? 'Migrado' : 
                   'Migrar a base de datos'}
                </span>
              </button>

              {migrationStatus === 'success' && (
                <button
                  onClick={handleClearLocal}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar datos locales</span>
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Importante:</strong></p>
              <p>• Crea un respaldo antes de migrar</p>
              <p>• La migración no elimina los datos locales automáticamente</p>
              <p>• Puedes usar ambos sistemas hasta estar seguro</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};