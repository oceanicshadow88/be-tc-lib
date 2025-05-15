export interface DomainConfig {
  protocol: string;
  mainDomain: string;
  connectTenantOrigin?: string;
  postman_testing?: string;
}

let _domainConfig: DomainConfig | null = null;

export const setDomainConfig = (config: DomainConfig) => {
  _domainConfig = {
    ...config,
    postman_testing: config.postman_testing ?? "false",
    connectTenantOrigin: config.connectTenantOrigin ?? "",
  };
};

export const getDomainConfig = (): DomainConfig => {
  if (!_domainConfig) {
    throw new Error("Domain config is not set");
  }
  return _domainConfig;
};
