package com.nexusflow.ai.service;

import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;

@Service
public class TextExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TextExtractionService.class);

    /** -1 removes Tika's default 100k character write limit. */
    private static final int NO_LIMIT = -1;

    public String extract(byte[] bytes, String fileName) {
        try {
            var handler = new BodyContentHandler(NO_LIMIT);
            var metadata = new Metadata();
            metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, fileName);

            new AutoDetectParser().parse(new ByteArrayInputStream(bytes), handler, metadata, new ParseContext());
            return handler.toString().strip();
        } catch (Exception e) {
            log.warn("Text extraction failed for {}: {}", fileName, e.getMessage());
            return "";
        }
    }
}
