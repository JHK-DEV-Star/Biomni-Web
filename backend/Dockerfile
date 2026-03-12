# 1. Conda base for bioinformatics tools
FROM continuumio/miniconda3

# 2. OS dependencies and compilation tools + PostgreSQL client
RUN apt-get update && apt-get install -y \
    git build-essential curl wget unzip gcc make jq r-base weasyprint \
    libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0 \
    libpq-dev \
    && curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash \
    && apt-get install -y git-lfs \
    && git lfs install \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Conda/Bioconda bioinformatics CLI tools
RUN conda install -y -c conda-forge -c bioconda \
    python=3.11 \
    blast samtools bowtie2 bwa bedtools fastqc trimmomatic \
    mafft gseapy mageck plannotate \
    && conda clean -afy

# 4. Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. GitHub repos and fast install tools
RUN pip install "git+https://github.com/YosefLab/popV.git@refs/pull/100/head" \
    && pip install "git+https://github.com/pylabrobot/pylabrobot.git" \
    && pip install uv \
    && uv pip install transcriptformer --system \
    && uv tool install arc-state

# 6. R packages (CRAN and Bioconductor)
RUN Rscript -e "install.packages(c('ggplot2', 'lme4', 'dplyr', 'tidyr', 'readr', 'stringr', 'Matrix', 'Rcpp', 'devtools', 'remotes', 'harmony', 'WGCNA', 'BiocManager'), repos='https://cran.rstudio.com/')" \
    && Rscript -e "BiocManager::install(c('DESeq2', 'dada2', 'xcms', 'flowCore', 'edgeR', 'limma', 'clusterProfiler', 'impute', 'preprocessCore', 'GO.db', 'AnnotationDbi'), ask=FALSE)"

# 7. FastTree CLI tool
RUN mkdir -p /app/biomni_tools/bin \
    && wget -O /app/biomni_tools/FastTree.c http://www.microbesonline.org/fasttree/FastTree.c \
    && gcc -O3 -finline-functions -funroll-loops -Wall -o /app/biomni_tools/bin/FastTree /app/biomni_tools/FastTree.c -lm \
    && rm -f /app/biomni_tools/FastTree.c
ENV PATH="/app/biomni_tools/bin:${PATH}"

# 8. OpenTelemetry auto-instrumentation
RUN opentelemetry-bootstrap -a install

# 9. Copy backend code
COPY . /app/backend_code
WORKDIR /app/backend_code

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
