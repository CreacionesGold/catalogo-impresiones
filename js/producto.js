(function () {
    const detailContainer = document.getElementById('productDetail');
    if (!detailContainer) {
        return;
    }

    const productId = Number(new URLSearchParams(window.location.search).get('id'));
    const currency = 'COP $';

    function formatPrice(price) {
        return `${currency}${Number(price).toLocaleString('es-CO')}`;
    }

    function getVariations(product) {
        return Array.isArray(product.variaciones) && product.variaciones.length
            ? product.variaciones
            : [{ id: 'estandar', nombre: 'Estándar', precio: product.precio }];
    }

    function getImages(product) {
        return Array.isArray(product.images) && product.images.length ? product.images : [product.imagen];
    }

    function getColorImages(product, color) {
        return color && Array.isArray(color.images) && color.images.length
            ? color.images
            : getImages(product);
    }

    function renderProduct(product) {
        const variations = getVariations(product);
        const colors = Array.isArray(product.colores) ? product.colores : [];
        let images = getImages(product);
        let currentImage = 0;
        let selectedVariation = variations[0];
        let selectedColor = null;

        detailContainer.textContent = '';

        const gallery = document.createElement('div');
        gallery.className = 'product-detail-gallery';

        const mainImage = document.createElement('img');
        mainImage.className = 'product-detail-image';
        mainImage.src = images[0];
        mainImage.alt = product.nombre;
        gallery.appendChild(mainImage);

        const thumbnails = document.createElement('div');
        thumbnails.className = 'product-detail-thumbnails';
        const renderGallery = (nextImages, colorName = '') => {
            images = nextImages;
            currentImage = 0;
            mainImage.src = images[0];
            mainImage.alt = `${product.nombre}${colorName ? ` en color ${colorName}` : ''}`;
            thumbnails.textContent = '';

            images.forEach((imageSource, index) => {
                const thumbnail = document.createElement('button');
                thumbnail.type = 'button';
                thumbnail.className = `product-detail-thumbnail${index === 0 ? ' active' : ''}`;
                thumbnail.setAttribute('aria-label', `${product.nombre}, vista ${index + 1}`);
                thumbnail.setAttribute('aria-pressed', String(index === 0));
                const thumbnailImage = document.createElement('img');
                thumbnailImage.src = imageSource;
                thumbnailImage.alt = '';
                thumbnail.appendChild(thumbnailImage);
                thumbnail.addEventListener('click', () => {
                    currentImage = index;
                    mainImage.src = images[currentImage];
                    thumbnails.querySelectorAll('.product-detail-thumbnail').forEach((item) => {
                        item.classList.remove('active');
                        item.setAttribute('aria-pressed', 'false');
                    });
                    thumbnail.classList.add('active');
                    thumbnail.setAttribute('aria-pressed', 'true');
                });
                thumbnails.appendChild(thumbnail);
            });
        };

        renderGallery(images);
        gallery.appendChild(thumbnails);

        const content = document.createElement('div');
        content.className = 'product-detail-content';
        content.innerHTML = `
            <p class="card-subtitle">${product.categoria}</p>
            <h1>${product.nombre}</h1>
            <p class="product-detail-description">${product.descripcion || ''}</p>
            <p class="product-detail-material"><strong>Material y acabado:</strong> ${product.material || 'Consultar disponibilidad'}</p>
        `;

        const variationField = document.createElement('div');
        variationField.className = 'product-detail-field';
        variationField.innerHTML = '<label for="detailVariation">Tamaño o variación</label>';
        const variationSelect = document.createElement('select');
        variationSelect.id = 'detailVariation';
        variationSelect.className = 'form-select';
        variations.forEach((variation) => {
            const option = document.createElement('option');
            option.value = variation.id;
            option.textContent = `${variation.nombre} - ${formatPrice(variation.precio)}`;
            variationSelect.appendChild(option);
        });
        variationField.appendChild(variationSelect);
        content.appendChild(variationField);

        const colorField = document.createElement('div');
        colorField.className = 'product-detail-field';
        colorField.innerHTML = '<span class="product-detail-label" id="detailColorLabel">Color</span>';
        const colorOptions = document.createElement('div');
        colorOptions.className = 'product-color-options';
        colorOptions.setAttribute('role', 'group');
        colorOptions.setAttribute('aria-labelledby', 'detailColorLabel');
        if (!colors.length) {
            colorField.hidden = true;
        }

        const allColorsButton = document.createElement('button');
        allColorsButton.type = 'button';
        allColorsButton.className = 'product-color-clear active';
        allColorsButton.textContent = 'Todos';
        allColorsButton.setAttribute('aria-label', 'Mostrar todos los colores');
        allColorsButton.setAttribute('aria-pressed', 'true');
        allColorsButton.title = 'Mostrar todos los colores';
        allColorsButton.addEventListener('click', () => {
            selectedColor = null;
            colorOptions.querySelectorAll('.product-color-option, .product-color-clear').forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-pressed', 'false');
            });
            allColorsButton.classList.add('active');
            allColorsButton.setAttribute('aria-pressed', 'true');
            renderGallery(getImages(product));
        });
        colorOptions.appendChild(allColorsButton);

        colors.forEach((color, index) => {
            const colorButton = document.createElement('button');
            colorButton.type = 'button';
            colorButton.className = 'product-color-option';
            colorButton.style.setProperty('--swatch-color', color.hex);
            colorButton.setAttribute('aria-label', `Color ${color.nombre}`);
            colorButton.setAttribute('aria-pressed', 'false');
            colorButton.title = color.nombre;
            colorButton.addEventListener('click', () => {
                selectedColor = color;
                colorField.classList.remove('product-detail-field-invalid');
                colorOptions.querySelectorAll('.product-color-option, .product-color-clear').forEach((item) => {
                    item.classList.remove('active');
                    item.setAttribute('aria-pressed', 'false');
                });
                colorButton.classList.add('active');
                colorButton.setAttribute('aria-pressed', 'true');
                renderGallery(getColorImages(product, color), color.nombre);
            });
            colorOptions.appendChild(colorButton);
        });
        colorField.appendChild(colorOptions);
        content.appendChild(colorField);

        const price = document.createElement('p');
        price.className = 'product-detail-price';
        price.setAttribute('aria-live', 'polite');
        price.setAttribute('aria-label', `Precio del producto: ${formatPrice(selectedVariation.precio)}`);
        price.textContent = formatPrice(selectedVariation.precio);
        variationSelect.addEventListener('change', () => {
            selectedVariation = variations.find((variation) => variation.id === variationSelect.value) || variations[0];
            price.textContent = formatPrice(selectedVariation.precio);
            price.setAttribute('aria-label', `Precio del producto: ${formatPrice(selectedVariation.precio)}`);
        });
        content.appendChild(price);

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-gold product-detail-add';
        addButton.textContent = 'Añadir a mi selección';
        addButton.addEventListener('click', () => {
            if (colors.length && !selectedColor) {
                colorField.classList.add('product-detail-field-invalid');
                allColorsButton.focus();
                return;
            }

            colorField.classList.remove('product-detail-field-invalid');
            if (typeof window.addProductToCart !== 'function') {
                return;
            }
            window.addProductToCart(product.id, selectedVariation.id, selectedColor?.id || '');
            addButton.textContent = 'Añadido a la selección';
            window.setTimeout(() => {
                addButton.textContent = 'Añadir a mi selección';
            }, 1400);
        });
        content.appendChild(addButton);

        const variationDescription = document.createElement('p');
        variationDescription.className = 'product-detail-variation-description';
        variationDescription.textContent = selectedVariation.descripcion || '';
        variationSelect.addEventListener('change', () => {
            selectedVariation = variations.find((variation) => variation.id === variationSelect.value) || variations[0];
            price.textContent = formatPrice(selectedVariation.precio);
            variationDescription.textContent = selectedVariation.descripcion || '';
        });
        content.appendChild(variationDescription);

        const shell = document.createElement('div');
        shell.className = 'product-detail-layout';
        shell.appendChild(gallery);
        shell.appendChild(content);
        detailContainer.appendChild(shell);
    }

    fetch('/catalogo/js/data.json')
        .then((response) => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el catálogo');
            }
            return response.json();
        })
        .then((catalog) => {
            const product = catalog.find((item) => item.id === productId);
            if (!product) {
                detailContainer.innerHTML = '<p class="filter-empty">No encontramos ese producto.</p>';
                return;
            }
            renderProduct(product);
        })
        .catch(() => {
            detailContainer.innerHTML = '<p class="filter-empty">No se pudo cargar el producto. Intenta nuevamente.</p>';
        });
})();
