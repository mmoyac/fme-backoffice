"use client";

import { useState } from "react";
import CategoriasList from "./components/CategoriasList";
import TiposList from "./components/TiposList";
import UnidadesList from "./components/UnidadesList";
import ProveedoresList from "./components/ProveedoresList";
import LocalesList from "./components/LocalesList";
import TiposDocumentoList from "./components/TiposDocumentoList";

export default function MantenedoresPage() {
    const [activeTab, setActiveTab] = useState("categorias");

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">⚙️ Mantenedores</h1>
                <p className="text-gray-400">
                    Gestión de tablas maestras del sistema
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-700 mb-6">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab("categorias")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "categorias"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        📦 Categorías
                    </button>
                    <button
                        onClick={() => setActiveTab("tipos")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🏷️ Tipos de Producto
                    </button>
                    <button
                        onClick={() => setActiveTab("unidades")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "unidades"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        📏 Unidades de Medida
                    </button>
                    <button
                        onClick={() => setActiveTab("locales")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "locales"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🏪 Locales
                    </button>
                    <button
                        onClick={() => setActiveTab("proveedores")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "proveedores"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🏢 Proveedores
                    </button>
                    <button
                        onClick={() => setActiveTab("tipos_documento")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos_documento"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        📄 Tipos Documento
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-800 rounded-lg p-6">
                {activeTab === "categorias" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Categorías de Producto</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona las categorías de productos y puntos de fidelidad
                        </p>
                        <CategoriasList />
                    </div>
                )}

                {activeTab === "tipos" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Producto</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de producto (Materia Prima, Producto Elaborado, etc.)
                        </p>
                        <TiposList />
                    </div>
                )}

                {activeTab === "unidades" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Unidades de Medida</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona las unidades de medida con soporte para conversiones
                        </p>
                        <UnidadesList />
                    </div>
                )}

                {activeTab === "locales" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Locales</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los locales o puntos de venta del negocio
                        </p>
                        <LocalesList />
                    </div>
                )}

                {activeTab === "proveedores" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Proveedores</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los proveedores para compras de insumos y materias primas
                        </p>
                        <ProveedoresList />
                    </div>
                )}

                {activeTab === "tipos_documento" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Documento</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de documento tributario (Factura, Boleta, Guía, etc.)
                        </p>
                        <TiposDocumentoList />
                    </div>
                )}
            </div>
        </div>
    );
}
