// Variables
function fetchJSONData() {
    const request = new XMLHttpRequest();
    request.open("GET", "/catalogo-impresiones/js/data.json", false);
    request.send(null);
    if (request.status === 200) {
      return JSON.parse(request.responseText);
    } else {
      console.error("Unable to fetch data:", request.statusText);
      throw new Error("Unable to fetch data");
    }
}

function toggler(divId) {
    $("#" + divId).toggle();
}

const CONTACT_EMAIL = 'goldimpresiones3@gmail.com';

function buildEmailLink(message, subject) {
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

function getProductVariations(product) {
    if (Array.isArray(product.variaciones) && product.variaciones.length) {
        return product.variaciones;
    }

    return [{
        id: 'estandar',
        nombre: 'Estándar',
        precio: Number(product.precio)
    }];
}

function getProductColors(product) {
    return Array.isArray(product.colores) ? product.colores : [];
}

function normalizeCartItem(item) {
    if (typeof item === 'object' && item !== null) {
        return {
            productoId: Number(item.productoId ?? item.id),
            variacionId: item.variacionId || 'estandar',
            colorId: item.colorId || ''
        };
    }

    return {
        productoId: Number(item),
        variacionId: 'estandar',
        colorId: ''
    };
}

function getCartItemKey(item) {
    const normalized = normalizeCartItem(item);
    return `${normalized.productoId}:${normalized.variacionId}:${normalized.colorId}`;
}

function getVariation(product, variationId) {
    return getProductVariations(product).find((variation) => variation.id === variationId)
        || getProductVariations(product)[0];
}

function getColor(product, colorId) {
    return getProductColors(product).find((color) => color.id === colorId);
}

function buildOrderMessageFromItems(items, catalog) {
    const normalizedItems = items.map(normalizeCartItem);
    const groupedItems = [...new Map(normalizedItems.map((item) => [getCartItemKey(item), item])).values()];
    const lines = [
        '*CONSULTA DE CATÁLOGO*',
        '',
        'Hola, quiero consultar por estos productos:',
        ''
    ];

    groupedItems.forEach((cartItem) => {
        const miItem = catalog.find((itemBaseDatos) => itemBaseDatos.id === cartItem.productoId);
        if (!miItem) {
            return;
        }

        const variation = getVariation(miItem, cartItem.variacionId);
        const color = getColor(miItem, cartItem.colorId);
        const cantidad = normalizedItems.filter((item) => getCartItemKey(item) === getCartItemKey(cartItem)).length;
        const options = [variation.nombre, color?.nombre].filter(Boolean).join(' / ');
        lines.push(`• ${cantidad}x ${miItem.nombre} (${options})`);
    });

    lines.push('', 'Quiero consultar disponibilidad, precio final, producción y opciones de entrega.');
    lines.push('', 'Gracias.');

    return lines.join('\n');
}

function buildBudgetMessageFromItems(items, catalog) {
    const normalizedItems = items.map(normalizeCartItem);
    const groupedItems = [...new Map(normalizedItems.map((item) => [getCartItemKey(item), item])).values()];
    const lines = [
        '*CONSULTA DE PRODUCTOS PERSONALIZADOS*',
        '',
        'Hola, quiero consultar una pieza personalizada.',
        '',
        '*Necesito la siguiente información:*',
        '• Imagen de referencia o archivo STL si lo tienen',
        '• Material de preferencia',
        '• Color deseado',
        '• Porcentaje de relleno si lo conoce',
        '• Si no conoce estos detalles, puede solicitar asesoría personalizada para definirlos junto con ustedes',
        '',
        '*Productos que me interesan:*'
    ];

    if (groupedItems.length === 0) {
        lines.push('• Aún no he seleccionado productos.');
    } else {
        groupedItems.forEach((cartItem) => {
            const miItem = catalog.find((itemBaseDatos) => itemBaseDatos.id === cartItem.productoId);
            if (!miItem) {
                return;
            }

            const variation = getVariation(miItem, cartItem.variacionId);
            const color = getColor(miItem, cartItem.colorId);
            const cantidad = normalizedItems.filter((item) => getCartItemKey(item) === getCartItemKey(cartItem)).length;
            const options = [variation.nombre, color?.nombre].filter(Boolean).join(' / ');
            lines.push(`• ${cantidad}x ${miItem.nombre} (${options})`);
        });
    }

    lines.push('', 'Gracias por su ayuda.');
    return lines.join('\n');
}

let imageViewerTrigger = null;

window.buildBudgetMessage = function (items = []) {
    const catalog = Array.isArray(window.catalogoData) ? window.catalogoData : [];
    return buildBudgetMessageFromItems(items, catalog);
};

window.buildOrderMessage = function (items = []) {
    const catalog = Array.isArray(window.catalogoData) ? window.catalogoData : [];
    return buildOrderMessageFromItems(items, catalog);
};

document.addEventListener('DOMContentLoaded', () => {
    const baseDeDatos = fetchJSONData();
    window.catalogoData = baseDeDatos;
    console.log(baseDeDatos);

    let carrito = [];
    const divisa = 'COP $';
    const DOMitems = document.querySelector('#items');
    const DOMcarrito = document.querySelector('#carrito');
    const DOMItems = document.querySelector('#num-items');
    const filterSidebar = document.querySelector('.catalog-sidebar');
    const filterToggle = document.querySelector('.filter-toggle');
    const filterList = document.querySelector('#filterList');
    const miLocalStorage = window.localStorage;

    window.addProductToCart = function (productoId, variacionId = 'estandar', colorId = '') {
        carrito.push({ productoId: Number(productoId), variacionId, colorId });
        renderizarCarrito();
        guardarCarritoEnLocalStorage();
    };

    function syncFilterPanelState() {
        if (!filterSidebar || !filterToggle || !filterList) {
            return;
        }

        const mobileView = window.matchMedia('(max-width: 1024px)').matches;
        const isCollapsed = filterSidebar.classList.contains('collapsed');

        if (!mobileView) {
            filterSidebar.classList.remove('collapsed');
            filterList.hidden = false;
            filterToggle.hidden = true;
            filterToggle.setAttribute('aria-expanded', 'true');
            filterToggle.querySelector('.filter-toggle-text').textContent = 'Ocultar filtros';
            applyCatalogGrid();
            return;
        }

        if (isCollapsed) {
            filterList.hidden = true;
            filterToggle.hidden = false;
            filterToggle.setAttribute('aria-expanded', 'false');
            filterToggle.querySelector('.filter-toggle-text').textContent = 'Mostrar filtros';
        } else {
            filterList.hidden = false;
            filterToggle.hidden = false;
            filterToggle.setAttribute('aria-expanded', 'true');
            filterToggle.querySelector('.filter-toggle-text').textContent = 'Ocultar filtros';
        }

        applyCatalogGrid();
    }

    function applyCatalogGrid() {
        const itemsGrid = document.querySelector('#items');
        if (!itemsGrid) {
            return;
        }

        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
        const isLarge = window.matchMedia('(min-width: 1024px) and (max-width: 1439px)').matches;
        const isUltraWide = window.matchMedia('(min-width: 1440px) and (max-width: 1919px)').matches;
        const isHuge = window.matchMedia('(min-width: 1920px)').matches;
        const panelVisible = !filterSidebar || !filterSidebar.classList.contains('collapsed') || !window.matchMedia('(max-width: 1024px)').matches;

        let classNames = 'row gx-4 gx-lg-5 justify-content-center catalog-grid';

        if (isMobile) {
            classNames += ' row-cols-1';
        } else if (isTablet) {
            classNames += panelVisible ? ' row-cols-2' : ' row-cols-3';
        } else if (isLarge) {
            classNames += ' row-cols-2';
        } else if (isUltraWide) {
            classNames += ' row-cols-3';
        } else if (isHuge) {
            classNames += ' row-cols-4';
        }

        itemsGrid.className = classNames;
    }

    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            if (!window.matchMedia('(max-width: 1024px)').matches) {
                return;
            }

            filterSidebar.classList.toggle('collapsed');
            syncFilterPanelState();
        });
    }

    window.addEventListener('resize', () => {
        syncFilterPanelState();
    });
    syncFilterPanelState();

    // Funciones
    let categoriaActiva = 'all';

    function renderizarFiltros() {
        const DOMFilterList = document.querySelector('#filterList');
        if (!DOMFilterList) {
            return;
        }

        const categorias = Array.from(new Set(baseDeDatos.map((item) => item.categoria))).sort((a, b) => a.localeCompare(b));
        DOMFilterList.textContent = '';

        const allButton = document.createElement('button');
        allButton.type = 'button';
        allButton.classList.add('filter-item');
        allButton.setAttribute('aria-pressed', String(categoriaActiva === 'all'));
        if (categoriaActiva === 'all') {
            allButton.classList.add('active');
        }
        allButton.textContent = 'Todas';
        allButton.addEventListener('click', () => {
            categoriaActiva = 'all';
            renderizarFiltros();
            renderizarProductos();
        });
        DOMFilterList.appendChild(allButton);

        categorias.forEach((categoria) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.classList.add('filter-item');
            btn.setAttribute('aria-pressed', String(categoriaActiva === categoria));
            if (categoriaActiva === categoria) {
                btn.classList.add('active');
            }
            btn.textContent = categoria;
            btn.addEventListener('click', () => {
                categoriaActiva = categoria;
                renderizarFiltros();
                renderizarProductos();
            });
            DOMFilterList.appendChild(btn);
        });
    }

    function ensureImageViewer() {
        let viewer = document.getElementById('productImageViewer');
        if (viewer) {
            return viewer;
        }

        viewer = document.createElement('div');
        viewer.id = 'productImageViewer';
        viewer.className = 'product-image-viewer';
        viewer.setAttribute('aria-hidden', 'true');
        viewer.setAttribute('inert', '');
        viewer.innerHTML = `
            <div class="viewer-panel" role="dialog" aria-modal="true" aria-label="Vista de imagen del producto">
                <button type="button" class="viewer-close" aria-label="Cerrar vista de imagen">×</button>
                <div class="viewer-stage">
                    <button type="button" class="viewer-nav viewer-prev" aria-label="Imagen anterior">‹</button>
                    <img class="viewer-image" src="" alt="Vista ampliada del producto" />
                    <button type="button" class="viewer-nav viewer-next" aria-label="Siguiente imagen">›</button>
                </div>
                <div class="viewer-thumbs"></div>
            </div>
        `;

        const closeViewer = () => {
            viewer.classList.remove('show');
            viewer.setAttribute('aria-hidden', 'true');
            viewer.setAttribute('inert', '');
            document.body.classList.remove('modal-open');
            if (imageViewerTrigger instanceof HTMLElement && imageViewerTrigger.isConnected) {
                imageViewerTrigger.focus();
            }
        };

        const closeButton = viewer.querySelector('.viewer-close');
        closeButton.addEventListener('click', closeViewer);

        viewer.addEventListener('click', (event) => {
            if (event.target === viewer) {
                closeViewer();
            }
        });

        document.body.appendChild(viewer);

        document.addEventListener('keydown', (event) => {
            if (!viewer.classList.contains('show')) {
                return;
            }

            if (event.key === 'Escape') {
                closeViewer();
                return;
            }

            if (event.key === 'Tab') {
                const focusable = Array.from(viewer.querySelectorAll('button:not(:disabled)'));
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        return viewer;
    }

    function openImageViewer(productImages, productName, initialIndex = 0) {
        const images = Array.isArray(productImages) && productImages.length ? productImages : [productImages];
        const viewer = ensureImageViewer();
        const image = viewer.querySelector('.viewer-image');
        const thumbContainer = viewer.querySelector('.viewer-thumbs');
        const prevButton = viewer.querySelector('.viewer-prev');
        const nextButton = viewer.querySelector('.viewer-next');
        imageViewerTrigger = document.activeElement;

        let currentIndex = Math.min(initialIndex, images.length - 1);

        const applyState = () => {
            image.src = images[currentIndex];
            image.alt = `${productName} vista ${currentIndex + 1}`;

            Array.from(thumbContainer.children).forEach((thumb, index) => {
                thumb.classList.toggle('active', index === currentIndex);
                thumb.setAttribute('aria-pressed', String(index === currentIndex));
            });

            prevButton.disabled = images.length <= 1;
            nextButton.disabled = images.length <= 1;
        };

        thumbContainer.textContent = '';
        images.forEach((imgSrc, index) => {
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.classList.add('viewer-thumb');
            thumb.setAttribute('aria-label', `${productName}, vista ${index + 1}`);
            thumb.setAttribute('aria-pressed', String(index === currentIndex));
            const thumbImage = document.createElement('img');
            thumbImage.src = imgSrc;
            thumbImage.alt = '';
            thumb.appendChild(thumbImage);
            if (index === currentIndex) {
                thumb.classList.add('active');
            }
            thumb.addEventListener('click', () => {
                currentIndex = index;
                applyState();
            });
            thumbContainer.appendChild(thumb);
        });

        prevButton.onclick = () => {
            currentIndex = currentIndex <= 0 ? images.length - 1 : currentIndex - 1;
            applyState();
        };

        nextButton.onclick = () => {
            currentIndex = currentIndex >= images.length - 1 ? 0 : currentIndex + 1;
            applyState();
        };

        applyState();
        viewer.classList.add('show');
        viewer.setAttribute('aria-hidden', 'false');
        viewer.removeAttribute('inert');
        document.body.classList.add('modal-open');
        viewer.querySelector('.viewer-close').focus();
    }

    /**
    * Dibuja todos los productos a partir de la base de datos.
    */
    function renderizarProductos() {
        if (!DOMitems) {
            return;
        }

        const productosFiltrados = categoriaActiva === 'all'
            ? baseDeDatos
            : baseDeDatos.filter((item) => item.categoria === categoriaActiva);
        const catalogStatus = document.getElementById('catalogStatus');
        if (catalogStatus) {
            const categoriaLabel = categoriaActiva === 'all' ? 'Todas las categorías' : categoriaActiva;
            catalogStatus.textContent = `${productosFiltrados.length} productos. ${categoriaLabel}.`;
        }

        DOMitems.textContent = '';

        if (!productosFiltrados.length) {
            const empty = document.createElement('div');
            empty.classList.add('filter-empty');
            empty.textContent = 'No hay productos en esta categoría.';
            DOMitems.appendChild(empty);
            return;
        }

        productosFiltrados.forEach((info) => {
            const miNodo = document.createElement('div');
            miNodo.classList.add('col', 'mb-5');

            const miNodoCard = document.createElement('div');
            miNodoCard.classList.add('card', 'h-100', 'product-card');

            const productMedia = document.createElement('div');
            productMedia.classList.add('product-media');

            const images = Array.isArray(info.images) && info.images.length ? info.images : [info.imagen];
            let cardImages = images;
            let activeCardImageIndex = 0;
            const miNodoImagen = document.createElement('img');
            miNodoImagen.classList.add('card-img-top');
            miNodoImagen.setAttribute('src', images[0]);
            miNodoImagen.setAttribute('alt', info.nombre);
            miNodoImagen.loading = 'lazy';

            const viewButton = document.createElement('button');
            viewButton.type = 'button';
            viewButton.classList.add('product-image-toggle');
            viewButton.innerHTML = '<i class="bi bi-zoom-in"></i><span>Ver imagen</span>';
            viewButton.setAttribute('aria-label', `Ver imagen de ${info.nombre}`);

            const miniaturas = document.createElement('div');
            miniaturas.classList.add('thumbnail-strip');

            const cambiarImagenActiva = (imgSrc, thumb) => {
                miNodoImagen.src = imgSrc;
                miNodoImagen.alt = `${info.nombre}, vista ${cardImages.indexOf(imgSrc) + 1}`;
                activeCardImageIndex = cardImages.indexOf(imgSrc);
                Array.from(miniaturas.children).forEach((item) => {
                    item.classList.remove('active');
                    item.setAttribute('aria-pressed', 'false');
                });
                thumb.classList.add('active');
                thumb.setAttribute('aria-pressed', 'true');
            };

            const renderizarMiniaturas = () => {
                miniaturas.textContent = '';
                activeCardImageIndex = 0;
                miNodoImagen.alt = `${info.nombre}, vista 1`;
                cardImages.slice(0, 3).forEach((imgSrc, index) => {
                const thumb = document.createElement('button');
                thumb.type = 'button';
                thumb.classList.add('thumbnail-item');
                if (index === 0) {
                    thumb.classList.add('active');
                }
                thumb.setAttribute('aria-label', `${info.nombre}, vista ${index + 1}`);
                thumb.setAttribute('aria-pressed', String(index === 0));
                thumb.addEventListener('click', () => cambiarImagenActiva(imgSrc, thumb));
                const thumbImage = document.createElement('img');
                thumbImage.src = imgSrc;
                thumbImage.alt = '';
                thumb.appendChild(thumbImage);
                miniaturas.appendChild(thumb);
                });
            };

            renderizarMiniaturas();

            viewButton.addEventListener('click', () => openImageViewer(cardImages, info.nombre, activeCardImageIndex));

            productMedia.appendChild(miNodoImagen);
            productMedia.appendChild(viewButton);
            productMedia.appendChild(miniaturas);

            const miNodoCardBody = document.createElement('div');
            miNodoCardBody.classList.add('card-body', 'text-center');

            const miNodoCategoria = document.createElement('p');
            miNodoCategoria.classList.add('card-subtitle');
            miNodoCategoria.textContent = info.categoria;

            const miNodoTitle = document.createElement('h5');
            miNodoTitle.classList.add('card-title', 'fw-bolder');
            miNodoTitle.textContent = info.nombre;

            const miNodoDescripcion = document.createElement('p');
            miNodoDescripcion.classList.add('card-description');
            miNodoDescripcion.textContent = info.descripcion || 'Consulta los detalles de esta pieza por correo.';

            const variationSelect = document.createElement('select');
            variationSelect.classList.add('form-select', 'product-option-select');
            variationSelect.setAttribute('aria-label', `Seleccionar variación de ${info.nombre}`);
            getProductVariations(info).forEach((variation) => {
                const option = document.createElement('option');
                option.value = variation.id;
                option.textContent = `${variation.nombre} - ${divisa}${Number(variation.precio).toLocaleString('es-CO')}`;
                variationSelect.appendChild(option);
            });

            const colorSelect = document.createElement('select');
            colorSelect.classList.add('form-select', 'product-option-select');
            colorSelect.setAttribute('aria-label', `Seleccionar color de ${info.nombre}`);
            if (getProductColors(info).length) {
                const allColorsOption = document.createElement('option');
                allColorsOption.value = '';
                allColorsOption.textContent = 'Todos los colores';
                allColorsOption.selected = true;
                colorSelect.appendChild(allColorsOption);

                getProductColors(info).forEach((color) => {
                    const option = document.createElement('option');
                    option.value = color.id;
                    option.textContent = `Color ${color.nombre}`;
                    colorSelect.appendChild(option);
                });
                colorSelect.required = true;
            } else {
                colorSelect.hidden = true;
            }

            const miNodoPrecio = document.createElement('p');
            miNodoPrecio.classList.add('card-text');
            const updateCardPrice = () => {
                const variation = getVariation(info, variationSelect.value);
                miNodoPrecio.textContent = `${divisa}${Number(variation.precio).toLocaleString('es-CO')}`;
                miNodoPrecio.setAttribute('aria-label', `Precio del producto: ${miNodoPrecio.textContent}`);
            };
            variationSelect.addEventListener('change', updateCardPrice);
            updateCardPrice();

            const miNodoBoton = document.createElement('button');
            miNodoBoton.classList.add('btn', 'btn-outline-gold', 'mt-auto');
            miNodoBoton.textContent = 'Añadir a mi selección';
            miNodoBoton.setAttribute('marcador', info.id);
            miNodoBoton.dataset.variation = variationSelect.value;
            miNodoBoton.dataset.color = colorSelect.value;
            variationSelect.addEventListener('change', () => {
                miNodoBoton.dataset.variation = variationSelect.value;
            });
            colorSelect.addEventListener('change', () => {
                miNodoBoton.dataset.color = colorSelect.value;
                colorSelect.setCustomValidity('');
                const selectedColor = getColor(info, colorSelect.value);
                cardImages = selectedColor && Array.isArray(selectedColor.images) && selectedColor.images.length
                    ? selectedColor.images
                    : images;
                miNodoImagen.src = cardImages[0];
                renderizarMiniaturas();
            });
            miNodoBoton.addEventListener('click', (event) => {
                if (getProductColors(info).length && !colorSelect.value) {
                    event.preventDefault();
                    colorSelect.focus();
                    colorSelect.setCustomValidity('Selecciona un color antes de añadirlo a tu selección.');
                    colorSelect.reportValidity();
                    return;
                }

                colorSelect.setCustomValidity('');
                anyadirProductoAlCarrito(event);
            });

            miNodoCardBody.appendChild(miNodoCategoria);
            miNodoCardBody.appendChild(miNodoTitle);
            miNodoCardBody.appendChild(miNodoDescripcion);
            miNodoCardBody.appendChild(variationSelect);
            miNodoCardBody.appendChild(colorSelect);
            miNodoCardBody.appendChild(miNodoPrecio);
            const detailLink = document.createElement('a');
            detailLink.href = `/catalogo-impresiones/producto.html?id=${encodeURIComponent(info.id)}`;
            detailLink.classList.add('product-detail-link');
            detailLink.textContent = 'Ver detalle completo';
            miNodoCardBody.appendChild(detailLink);
            miNodoCard.appendChild(productMedia);
            miNodoCard.appendChild(miNodoCardBody);
            miNodoCard.appendChild(miNodoBoton);
            miNodo.appendChild(miNodoCard);
            DOMitems.appendChild(miNodo);
        });
    }

    /**
    * Añade un producto a la selección del catálogo.
    */
    function anyadirProductoAlCarrito(evento) {
        window.addProductToCart(
            evento.target.getAttribute('marcador'),
            evento.target.dataset.variation || 'estandar',
            evento.target.dataset.color || ''
        );
    }

    /**
    * Dibuja todos los productos de la selección.
    */
    function renderizarCarrito() {
        const DOMCartContent = document.querySelector('#cartContent');
        if (!DOMcarrito || !DOMItems || !DOMCartContent) {
            return;
        }

        DOMCartContent.textContent = '';

        if (carrito.length === 0) {
            const emptyWrap = document.createElement('div');
            emptyWrap.classList.add('cart-empty-wrap');

            const itemVacio = document.createElement('p');
            itemVacio.classList.add('cart-empty');
            itemVacio.textContent = 'Aún no has seleccionado productos.';

            const cerrarBtn = document.createElement('button');
            cerrarBtn.type = 'button';
            cerrarBtn.classList.add('btn', 'btn-gold', 'cart-close-inline');
            cerrarBtn.textContent = 'Seguir explorando';
            cerrarBtn.addEventListener('click', function () {
                if (window.closeCartDrawer) {
                    window.closeCartDrawer();
                }
            });

            emptyWrap.appendChild(itemVacio);
            emptyWrap.appendChild(cerrarBtn);
            DOMCartContent.appendChild(emptyWrap);
            DOMItems.textContent = '0';
            return;
        }

        const carritoNormalizado = carrito.map(normalizeCartItem);
        const carritoSinDuplicados = [...new Map(carritoNormalizado.map((item) => [getCartItemKey(item), item])).values()];

        carritoSinDuplicados.forEach((cartItem) => {
            const miItem = baseDeDatos.find((itemBaseDatos) => itemBaseDatos.id === cartItem.productoId);
            if (!miItem) {
                return;
            }

            const variation = getVariation(miItem, cartItem.variacionId);
            const color = getColor(miItem, cartItem.colorId);
            const cartKey = getCartItemKey(cartItem);
            const numeroUnidadesItem = carritoNormalizado.filter((item) => getCartItemKey(item) === cartKey).length;

            const miNodo = document.createElement('div');
            miNodo.classList.add('cart-row');

            const texto = document.createElement('span');
            texto.classList.add('cart-product-name');
            const options = [variation.nombre, color?.nombre].filter(Boolean).join(' / ');
            texto.textContent = `${numeroUnidadesItem} x ${miItem.nombre} (${options})`;

            const precio = document.createElement('span');
            precio.classList.add('cart-product-price');
            precio.textContent = `${divisa}${Number(variation.precio).toLocaleString('es-CO')}`;

            const miBoton = document.createElement('button');
            miBoton.classList.add('btn', 'btn-outline-gold', 'cart-remove-btn');
            miBoton.textContent = 'Quitar';
            miBoton.setAttribute('aria-label', `Quitar ${miItem.nombre} de la selección`);
            miBoton.dataset.item = cartKey;
            miBoton.addEventListener('click', borrarItemCarrito);

            miNodo.appendChild(texto);
            miNodo.appendChild(precio);
            miNodo.appendChild(miBoton);
            DOMCartContent.appendChild(miNodo);
        });

        const consultar = document.createElement('div');
        const consultarBtn = document.createElement('a');
        consultarBtn.href = buildEmailLink(buildOrderMessage(), 'Consulta sobre productos del catálogo');
        consultarBtn.id = 'boton-comprar';
        consultarBtn.classList.add('btn', 'btn-gold', 'cart-action');
        consultarBtn.textContent = 'Consultar esta selección por correo';
        consultar.appendChild(consultarBtn);
        DOMCartContent.appendChild(consultar);

        const presupuesto = document.createElement('div');
        const presupuestoBtn = document.createElement('a');
        presupuestoBtn.href = buildEmailLink(buildBudgetMessage(), 'Consulta sobre personalización');
        presupuestoBtn.id = 'boton-presupuesto';
        presupuestoBtn.classList.add('btn', 'btn-outline-dark', 'cart-action');
        presupuestoBtn.textContent = 'Consultar personalización por correo';
        presupuesto.appendChild(presupuestoBtn);
        DOMCartContent.appendChild(presupuesto);

        const vaciar = document.createElement('div');
        const vaciarBtn = document.createElement('button');
        vaciarBtn.id = 'boton-vaciar';
        vaciarBtn.classList.add('btn', 'btn-outline-dark', 'cart-action');
        vaciarBtn.textContent = 'Vaciar selección';
        vaciar.appendChild(vaciarBtn);
        DOMCartContent.appendChild(vaciar);

        const cerrar = document.createElement('div');
        const cerrarBtn = document.createElement('button');
        cerrarBtn.type = 'button';
        cerrarBtn.classList.add('btn', 'btn-outline-dark', 'cart-action', 'cart-close-inline');
        cerrarBtn.textContent = 'Seguir explorando';
        cerrarBtn.addEventListener('click', function () {
            if (window.closeCartDrawer) {
                window.closeCartDrawer();
            }
        });
        cerrar.appendChild(cerrarBtn);
        DOMCartContent.appendChild(cerrar);

        DOMItems.textContent = carrito.length;
        vaciarBtn.addEventListener('click', vaciarCarrito);
    }

    /**
    * Quita un producto de la selección.
    */
    function borrarItemCarrito(evento) {
        const key = evento.target.dataset.item;
        carrito = carrito.filter((cartItem) => {
            return getCartItemKey(cartItem) !== key;
        });
        // volvemos a renderizar
        renderizarCarrito();
        // Actualizamos el LocalStorage
        guardarCarritoEnLocalStorage();

    }

    function buildOrderMessage() {
        return buildOrderMessageFromItems(carrito, baseDeDatos, divisa);
    }

    function buildBudgetMessage() {
        return buildBudgetMessageFromItems(carrito, baseDeDatos, divisa);
    }

    /**
     * Resumen de los productos que se solicitan
     */
    function summarize() {
        return buildOrderMessage();
    }

    /**
    * Varia el carrito y vuelve a dibujarlo
    */
    function vaciarCarrito() {
        // Limpiamos los productos guardados
        carrito = [];
        // Renderizamos los cambios
        renderizarCarrito();
        // Borra LocalStorage
        miLocalStorage.removeItem('carrito');

    }

    function guardarCarritoEnLocalStorage () {
        miLocalStorage.setItem('carrito', JSON.stringify(carrito));
    }

    function cargarCarritoDeLocalStorage () {
        if (miLocalStorage.getItem('carrito') !== null) {
            try {
                const savedCart = JSON.parse(miLocalStorage.getItem('carrito'));
                if (!Array.isArray(savedCart)) {
                    throw new Error('El contenido guardado no es una selección válida.');
                }
                carrito = savedCart
                    .map(normalizeCartItem)
                    .filter((cartItem) => baseDeDatos.some((product) => product.id === cartItem.productoId));
                guardarCarritoEnLocalStorage();
            } catch (error) {
                console.error('No se pudo restaurar la selección guardada; se descartará.', error);
                carrito = [];
                miLocalStorage.removeItem('carrito');
            }
        }
    }

    // Inicio
    cargarCarritoDeLocalStorage();
    renderizarFiltros();
    renderizarProductos();
    renderizarCarrito();
});