"use client";

import { useState } from "react";
import CategoriasList from "./components/CategoriasList";
import TiposList from "./components/TiposList";
import UnidadesList from "./components/UnidadesList";

export default function MantenedoresPage() {
    const [activeTab, setActiveTab] = useState("categorias");

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">⚙️ Mantenedores</h1>
                <p className="text-gray-600">
                    Gestión de tablas maestras del sistema
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab("categorias")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "categorias"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        📦 Categorías
                    </button>
                    <button
                        onClick={() => setActiveTab("tipos")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        🏷️ Tipos de Producto
                    </button>
                    <button
                        onClick={() => setActiveTab("unidades")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "unidades"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        📏 Unidades de Medida
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === "categorias" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Categorías de Producto</h2>
                        <p className="text-gray-600 mb-4">
                            Gestiona las categorías de productos y puntos de fidelidad
                        </p>
                        <CategoriasList />
                    </div>
                )}

                {activeTab === "tipos" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Tipos de Producto</h2>
                        <p className="text-gray-600 mb-4">
                            Gestiona los tipos de producto (Materia Prima, Producto Elaborado, etc.)
                        </p>
                        <TiposList />
                    </div>
                )}

                {activeTab === "unidades" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Unidades de Medida</h2>
                        <p className="text-gray-600 mb-4">
                            Gestiona las unidades de medida con soporte para conversiones
                        </p>
                        <UnidadesList />
                    </div>
                )}
            </div>
        </div>
    );
}
