FROM golang:alpine as build

RUN apk add --update git

RUN go get github.com/a8m/envsubst/cmd/envsubst \
    && cd /go/src/github.com/a8m/envsubst/cmd/envsubst \
    && env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build


FROM node:8-alpine

COPY --from=build /go/src/github.com/a8m/envsubst/cmd/envsubst/envsubst /usr/local/bin/envsubst

COPY config-merge.js source.sh package.json wrapper.sh /usr/local/config-merge/
RUN cd /usr/local/config-merge \
    && yarn install

WORKDIR /home/node
USER node:node
ENTRYPOINT ["/bin/sh", "/usr/local/config-merge/wrapper.sh"]
