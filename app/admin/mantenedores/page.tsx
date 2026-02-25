"use client";

import { useState } from "react";
import CategoriasList from "./components/CategoriasList";
import TiposList from "./components/TiposList";
import UnidadesList from "./components/UnidadesList";
import ProveedoresList from "./components/ProveedoresList";
import TiposProveedorList from "./components/TiposProveedorList";
import LocalesList from "./components/LocalesList";
import TiposDocumentoList from "./components/TiposDocumentoList";
import TiposPedidoList from "./components/TiposPedidoList";
import TiposVehiculoList from "./components/TiposVehiculoList";
import EstadosEnrolamientoList from "./components/EstadosEnrolamientoList";

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
                        onClick={() => setActiveTab("estados_enrolamiento")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "estados_enrolamiento"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🟢 Estados de Enrolamiento
                    </button>
                    <button
                        onClick={() => setActiveTab("tipos_vehiculo")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos_vehiculo"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🚚 Tipos de Vehículo
                    </button>
                    <button
                        onClick={() => setActiveTab("paletas_colores")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "paletas_colores"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🎨 Paleta de Colores
                    </button>
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
                        onClick={() => setActiveTab("tipos_proveedor")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos_proveedor"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🏭 Tipos Proveedor
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
                    <button
                        onClick={() => setActiveTab("tipos_pedido")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tipos_pedido"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        📦 Tipos Pedido
                    </button>
                    <button
                        onClick={() => setActiveTab("config_landing")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "config_landing"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🌐 Config. Landing
                    </button>
                    <button
                        onClick={() => setActiveTab("usuarios")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "usuarios"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        👤 Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab("tenants")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "tenants"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-slate-600"
                            }`}
                    >
                        🏢 Tenants (SaaS)
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-800 rounded-lg p-6">
                {activeTab === "estados_enrolamiento" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Estados de Enrolamiento</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los estados posibles de un enrolamiento (ej: Pendiente, En Proceso, Finalizado, etc.)
                        </p>
                        <EstadosEnrolamientoList />
                    </div>
                )}
                {activeTab === "tipos_vehiculo" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Vehículo</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de vehículo utilizados en enrolamientos y logística.
                        </p>
                        <TiposVehiculoList />
                    </div>
                )}

                {activeTab === "paletas_colores" && (() => {
                    // Dynamic require to avoid build error
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const PaletasColoresList = require("./components/PaletasColoresList").default;
                    return <PaletasColoresList />;
                })()}

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

                {activeTab === "tipos_proveedor" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Proveedor</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de proveedor (Materias Primas, Insumos, Servicios, etc.)
                        </p>
                        <TiposProveedorList />
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

                {activeTab === "tipos_pedido" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tipos de Pedido</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona los tipos de pedido y sus locales de despacho por defecto
                        </p>
                        <TiposPedidoList />
                    </div>
                )}

                {activeTab === "config_landing" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Configuración de Landing Page</h2>
                        <p className="text-gray-400 mb-4">
                            Personaliza la apariencia y contenido de tu landing page
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La configuración de landing está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/configuracion/landing"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                🌐 Ir a Configuración de Landing
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === "usuarios" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Usuarios del Sistema</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona usuarios, roles y permisos del sistema
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La gestión de usuarios está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/usuarios"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                👤 Ir a Gestión de Usuarios
                            </a>
                        </div>
                    </div>
                )}

                {activeTab === "tenants" && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Tenants Multi-Tenant SaaS</h2>
                        <p className="text-gray-400 mb-4">
                            Gestiona clientes de la plataforma (activar/desactivar, ajustar correlativos)
                        </p>
                        <div className="bg-slate-700 rounded-lg p-6 text-center">
                            <p className="text-gray-300 mb-4">
                                La gestión de tenants está disponible en una página dedicada
                            </p>
                            <a
                                href="/admin/tenants"
                                className="inline-block bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                🏢 Ir a Gestión de Tenants
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
