ARG PARENT_IMAGE=cirss/tro-checks-parent:latest

FROM ${PARENT_IMAGE}

COPY exports /repro/exports

ADD ${REPRO_DIST}/boot-setup /repro/dist/

RUN bash /repro/dist/boot-setup

USER repro

RUN repro.require tro-checks exports

RUN repro.require ai-coding-dev main ${CIRSS} --report

CMD  /bin/bash -il
